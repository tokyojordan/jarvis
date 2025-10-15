# Jarvis n8n Setup

## Quick Start
```bash
# Start n8n
docker-compose up -d

# View logs
docker-compose logs -f

# Stop n8n
docker-compose down

# Restart n8n
docker-compose restart

# Fresh start (delete all data)
docker-compose down
rm -rf data/*
docker-compose up -d
```

## Access

- **n8n UI**: http://localhost:5678
- **Username**: admin
- **Password**: admin123

## Data Location

- **SQLite Database**: `./data/database.sqlite`
- **Workflows**: `./data/workflows/`
- **Credentials**: `./data/credentials/` (encrypted)

## Backup
```bash
# Backup everything
tar -czf n8n-backup-$(date +%Y%m%d).tar.gz data/

# Restore
tar -xzf n8n-backup-YYYYMMDD.tar.gz
```

## Integration with Jarvis Backend

Update `../backend/.env`:
```
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=your-webhook-secret-here
```