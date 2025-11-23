cat > README.md << 'EOF'
# Coworking Check-in/out System

NFC-based check-in/checkout system for coworking spaces using Raspberry Pi and cloud-hosted web application.

## Features

- ✅ NFC card reader integration (Raspberry Pi)
- ✅ Automatic check-in/out toggle (same card tap)
- ✅ User management (CRUD operations)
- ✅ Real-time occupancy tracking
- ✅ Session duration calculation
- ✅ Check-in/out history
- ✅ User statistics and analytics
- ✅ Cloud-based API with web dashboard

## System Architecture
```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  NFC Card       │──────▶│  Raspberry Pi    │──────▶│  Cloud API      │
│  (User ID)      │       │  (Python Reader) │       │  (Node.js)      │
└─────────────────┘       └──────────────────┘       └─────────────────┘
                                                              │
                                                              ▼
                                                      ┌─────────────────┐
                                                      │  Web Dashboard  │
                                                      │  (React)        │
                                                      └─────────────────┘
```

## Installation

### 1. Backend Deployment (Cloud)

#### Deploy to Railway:
1. Push this repo to GitHub
2. Go to [Railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Railway will automatically detect and deploy

#### Or deploy to Heroku:
```bash
heroku create your-coworking-app
git push heroku main
```

### 2. Raspberry Pi Setup

#### Install Dependencies:
```bash
sudo apt-get update
sudo apt-get install python3-pip
pip3 install nfcpy requests
```

#### Update Configuration:
1. Edit `nfc_reader.py`
2. Change `API_URL` to your deployed Railway URL:
```python
   API_URL = "https://your-app.railway.app/api/checkin"
```

#### Run the Reader:
```bash
python3 nfc_reader.py
```

#### Run as Service (Optional):
Create `/etc/systemd/system/nfc-reader.service`:
```ini
[Unit]
Description=NFC Card Reader Service
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/pi/coworking-checkin-system/nfc_reader.py
WorkingDirectory=/home/pi/coworking-checkin-system
StandardOutput=inherit
StandardError=inherit
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable nfc-reader
sudo systemctl start nfc-reader
sudo systemctl status nfc-reader
```

### 3. Local Development
```bash
# Install dependencies
npm install

# Run server
npm start

# Server runs on http://localhost:3000
```

## API Endpoints

### Check-in/out
- `POST /api/checkin` - Process NFC card tap
```json
  { "card_id": "abc123", "timestamp": "2024-01-01T12:00:00Z" }
```

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/:id/stats` - Get user statistics

### Check-ins
- `GET /api/checkins` - Get all check-ins
- `GET /api/checkins/active` - Get currently checked-in users

## Usage

### 1. Add Users
1. Visit your deployed URL (e.g., `https://your-app.railway.app`)
2. Go to "Users" tab
3. Add user details and NFC card ID
4. Save user

### 2. Get Card IDs
You can get the card ID by:
- Running the NFC reader and tapping an unregistered card
- Checking the console output for the card ID
- Adding that ID to a user in the web interface

### 3. Check In/Out
Simply tap your NFC card on the reader:
- First tap: Check in
- Second tap: Check out
- Automatic session tracking

## Project Structure
```
coworking-checkin-system/
├── server.js           # Express API server
├── package.json        # Node.js dependencies
├── nfc_reader.py       # Raspberry Pi NFC reader script
├── coworking.db        # SQLite database (auto-created)
├── frontend/
│   ├── index.html      # Web dashboard HTML
│   └── app.js          # React frontend application
└── README.md
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  card_id TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);
```

### Check-ins Table
```sql
CREATE TABLE checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT,
  duration TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Troubleshooting

### NFC Reader Not Detecting
- Check USB connection
- Verify driver installation: `lsusb`
- Test with: `python3 -m nfc`

### API Connection Error
- Verify API URL in `nfc_reader.py`
- Check internet connection
- Ensure deployed app is running

### Card Not Registered Error
- Get card ID from reader console
- Add card ID to user in web interface

## Technologies Used

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Tailwind CSS, Lucide Icons
- **Hardware**: Raspberry Pi 5, NFC Reader (PN532/RC522)
- **Python**: nfcpy library for NFC communication

## License

MIT

## Contributing

Pull requests welcome! Please open an issue first to discuss changes.

## Support

For issues or questions, please open a GitHub issue.
EOF