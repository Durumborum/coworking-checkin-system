cat > nfc_reader.py << 'EOF'
#!/usr/bin/env python3
"""
NFC Card Reader for Coworking Check-in System
Reads NFC cards and sends check-in/out requests to the API
"""

import nfc
import requests
import time
from datetime import datetime

# Configuration - UPDATE THIS with your deployed Railway URL
API_URL = "http://localhost:3000/api/checkin"  # Change to your Railway URL after deployment
# Example: API_URL = "https://your-app.railway.app/api/checkin"

def read_nfc_card():
    """
    Main function to read NFC cards and send to API
    """
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
EOF

# Make it executable
chmod +x nfc_reader.py