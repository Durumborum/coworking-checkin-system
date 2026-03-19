#!/usr/bin/env python3
"""
NFC Card Reader for Coworking Check-in System
Reads NFC cards and sends check-in/out requests to the API
"""

import nfc
import requests
import time
import fcntl
import subprocess
from datetime import datetime

# Configuration - UPDATE THIS with your deployed Vercel URL
# Example: "https://your-project.vercel.app/api/checkin"
API_URL = "http://localhost:3000/api/checkin"

def reset_nfc_device():
    """Reset ACR122U USB device before connecting if it's currently busy or not found"""
    USBDEVFS_RESET = 0x5514
    result = subprocess.run(['lsusb'], capture_output=True, text=True)
    for line in result.stdout.splitlines():
        # ACR122U (072f:2200) or other NFC readers
        if '072f:2200' in line or 'NFC' in line:
            try:
                # Extract bus and device number
                parts = line.split()
                bus = parts[1]
                dev = parts[3].rstrip(':')
                path = f'/dev/bus/usb/{bus}/{dev}'
                with open(path, 'wb') as f:
                    fcntl.ioctl(f, USBDEVFS_RESET, 0)
                print(f"✓ NFC device reset ({path})")
                time.sleep(2)
            except Exception as e:
                print(f"  Warning: could not reset device: {e}")

def read_nfc_card():
    """
    Main function to read NFC cards and send to API
    """
    # Reset device hardware first
    reset_nfc_device()
    
    try:
        # Connect to NFC reader
        clf = nfc.ContactlessFrontend('usb')
        print("✓ NFC Reader connected successfully")
    except Exception as e:
        print(f"✗ Error connecting to NFC reader: {e}")
        print("  Make sure your NFC reader is connected via USB")
        return
    
    print(f"✓ API endpoint: {API_URL}")
    print("━" * 50)
    print("🔵 NFC Reader ready. Waiting for cards...")
    print("━" * 50)
    
    while True:
        try:
            # Wait for card to be presented
            tag = clf.connect(rdwr={'on-connect': lambda tag: False})
            
            if tag:
                # Get card UID (unique identifier)
                card_id = tag.identifier.hex()
                timestamp = datetime.now().isoformat()
                
                print(f"\n🔵 Card detected")
                print(f"   Card ID: {card_id}")
                print(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                # Send to API
                try:
                    response = requests.post(
                        API_URL, 
                        json={
                            'card_id': card_id,
                            'timestamp': timestamp
                        }, 
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        action = result.get('action', 'unknown')
                        user = result.get('user', 'Unknown')
                        
                        if action == 'checkin':
                            print(f"   ✓ CHECK IN: {user}")
                        else:
                            duration = result.get('duration', '')
                            print(f"   ✓ CHECK OUT: {user}")
                            if duration:
                                print(f"   Duration: {duration}")
                    elif response.status_code == 404:
                        print(f"   ✗ Card not registered")
                        print(f"   Please add this card in the web interface")
                    else:
                        print(f"   ✗ Error: {response.status_code}")
                        print(f"   {response.text}")
                        
                except requests.exceptions.ConnectionError:
                    print(f"   ✗ Cannot connect to server")
                    print(f"   Check if API is running at: {API_URL}")
                except requests.exceptions.Timeout:
                    print(f"   ✗ Request timeout")
                except Exception as e:
                    print(f"   ✗ Network error: {e}")
                
                # Wait before reading again (prevents double-scans)
                print("━" * 50)
                time.sleep(3)
                
        except KeyboardInterrupt:
            print("\n\n✓ Shutting down NFC reader...")
            break
        except Exception as e:
            print(f"✗ Error: {e}")
            time.sleep(1)
    
    clf.close()
    print("✓ NFC reader closed")

if __name__ == '__main__':
    print("""
╔════════════════════════════════════════════════╗
║   Coworking NFC Check-in Reader                ║
║   Press Ctrl+C to exit                         ║
╚════════════════════════════════════════════════╝
    """)
    read_nfc_card()
