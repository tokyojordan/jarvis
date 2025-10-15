# Start n8n
cd jarvis/n8n && docker-compose up -d

# Stop n8n
cd jarvis/n8n && docker-compose down

# View logs (real-time)
cd jarvis/n8n && docker-compose logs -f

# Restart n8n
cd jarvis/n8n && docker-compose restart

# Check status
cd jarvis/n8n && docker-compose ps

# Execute commands inside n8n container
docker exec -it jarvis-n8n n8n --help

# Backup data
cd jarvis/n8n
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Fresh start (CAUTION: Deletes all workflows and data!)
cd jarvis/n8n
docker-compose down
rm -rf data/
docker-compose up -d
```

---

## What Gets Stored in `data/`
```
n8n/data/
├── database.sqlite          # SQLite database (workflows, executions, settings)
├── .n8n/
│   ├── credentials/         # Encrypted credentials
│   ├── nodes/              # Custom nodes (if any)
│   └── workflows/          # Workflow backups
└── .n8n_encryption_key     # Encryption key (generated automatically)