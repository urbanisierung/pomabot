# Fly.io Deployment Guide for PomaBot

This guide covers deploying PomaBot to Fly.io for cost-effective production hosting (~$2-5/month).

## Prerequisites

1. **Fly.io Account**: Sign up at https://fly.io/app/sign-up
2. **Fly CLI**: Install the command-line tool
3. **Polymarket API Key** (optional for read-only monitoring)
4. **Slack Webhook URL** (from Phase 2)
5. **Logtail Account** (optional for external logging): https://betterstack.com/logtail

## Installation Steps

### 1. Install Fly CLI

```bash
# Linux/macOS
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Verify installation
fly version
```

### 2. Authenticate with Fly.io

```bash
fly auth login
```

This will open your browser to complete authentication.

### 3. Create and Configure App

From the project root directory:

```bash
# Launch app (creates fly.toml if not exists, but don't deploy yet)
fly launch --name pomabot --region fra --no-deploy

# Note: Choose a region close to you:
# - fra (Frankfurt, Germany)
# - iad (Virginia, USA)
# - syd (Sydney, Australia)
# - sin (Singapore)
```

The `fly.toml` file already exists in the repository with optimized settings.

### 4. Set Environment Secrets

```bash
# Required: Slack webhook (from Phase 2)
fly secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Optional: Polymarket API key for live trading (leave out for read-only mode)
# fly secrets set POLYMARKET_API_KEY="your_polymarket_api_key"

# Optional: Logtail token for external logging
# fly secrets set LOGTAIL_TOKEN="your_logtail_source_token"

# Optional: Custom audit log path (defaults to ./audit-logs)
# fly secrets set AUDIT_LOG_PATH="/app/audit-logs"

# Verify secrets
fly secrets list
```

### 5. Deploy the App

```bash
# Deploy to Fly.io
fly deploy

# This will:
# 1. Build the Docker image using the multi-stage Dockerfile
# 2. Push the image to Fly.io registry
# 3. Create/update the machine
# 4. Start the application
```

### 6. Verify Deployment

```bash
# Check app status
fly status

# View recent logs
fly logs

# View real-time logs (Ctrl+C to exit)
fly logs -f

# Open the app in browser
fly open
```

## Post-Deployment

### Monitoring

```bash
# View live logs
fly logs -f

# Check machine stats
fly status

# SSH into the machine
fly ssh console
```

### API Endpoints

Once deployed, your app will be available at `https://pomabot.fly.dev`:

- `GET /api/health` - Health check
- `GET /api/status` - System status
- `GET /api/markets` - Market states

### Audit Logs

Audit logs are stored locally in `/app/audit-logs` as CSV files:

```bash
# SSH into machine
fly ssh console

# View audit logs
cd /app/audit-logs
ls -lh
cat audit-2025-12-30.csv
```

### Git-Based Log Persistence (Optional)

To persist audit logs to Git:

```bash
# SSH into machine
fly ssh console

# Configure git (one-time setup)
git config --global user.email "bot@pomabot.app"
git config --global user.name "PomaBot"

# Set up GitHub credentials (use personal access token)
git remote set-url origin https://YOUR_TOKEN@github.com/yourusername/pomabot.git

# Commit and push logs daily (add to cron or scheduled job)
cd /app
git add audit-logs/
git commit -m "chore: update audit logs $(date +%Y-%m-%d)"
git push origin main
```

**Note:** For production, consider using a dedicated Git repository for audit logs or a proper backup solution.

## Cost Optimization

### Current Configuration

The `fly.toml` is configured for minimal cost:

```toml
[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"                 # ~$1.94/month

[http_service]
  auto_stop_machines = "stop"      # Stop when idle
  auto_start_machines = true       # Auto-start on request
  min_machines_running = 0         # Allow scaling to zero
```

### Estimated Monthly Cost

| Resource | Cost |
|----------|------|
| Machine (shared-cpu-1x, 256MB) | ~$1.94/month |
| Stopped machine storage (~200MB) | ~$0.03/month |
| SSL Certificate | Free (first 10) |
| Bandwidth (100GB) | Free |
| **Total** | **~$2-5/month** |

### Scaling Options

If you need more resources:

```bash
# Increase memory to 512MB (~$3.19/month)
fly scale memory 512

# Increase to 1GB (~$5.70/month)
fly scale memory 1024

# Check current scale
fly scale show
```

## External Logging with Logtail

### Setup

1. Create account at https://betterstack.com/logtail
2. Create a new source (Node.js)
3. Copy the source token
4. Set as Fly secret:

```bash
fly secrets set LOGTAIL_TOKEN="your_logtail_source_token"
```

### Features

- **Structured logs**: JSON format with all audit fields
- **Real-time search**: Query logs instantly
- **Alerts**: Set up notifications for errors
- **Dashboards**: Visualize system activity
- **SQL queries**: Analyze historical data

Free tier: 1GB/month (plenty for PomaBot)

## Troubleshooting

### Build Failures

```bash
# View build logs
fly logs --app pomabot

# Force rebuild
fly deploy --no-cache
```

### Memory Issues

If the app runs out of memory:

```bash
# Increase memory
fly scale memory 512

# Restart the app
fly apps restart pomabot
```

### Connection Issues

```bash
# Check if app is running
fly status

# Check health endpoint
curl https://pomabot.fly.dev/api/health

# View logs for errors
fly logs -f
```

### SSH Access

```bash
# Connect to machine
fly ssh console

# Check running processes
ps aux

# Check memory usage
free -m

# Check disk usage
df -h

# Check Node.js process
node -v
```

## Updating the App

### Deploy New Version

```bash
# From local repository
git pull origin main
fly deploy
```

### Rollback

```bash
# List releases
fly releases

# Rollback to previous release
fly releases rollback
```

## Security Best Practices

1. **Never commit secrets** - Use `fly secrets` for sensitive data
2. **Use read-only mode** initially - Test without API key first
3. **Monitor logs** - Set up Logtail alerts for errors
4. **Limit resources** - Start with minimal memory/CPU
5. **Regular backups** - Commit audit logs to Git periodically

## Useful Commands Reference

```bash
# App management
fly status                    # Check app status
fly logs                      # View recent logs
fly logs -f                   # Follow logs in real-time
fly ssh console              # SSH into machine
fly apps list                # List all your apps
fly apps destroy pomabot     # Delete app (careful!)

# Deployment
fly deploy                   # Deploy current code
fly deploy --no-cache        # Force rebuild
fly releases                 # List releases
fly releases rollback        # Rollback to previous

# Scaling
fly scale show               # Show current scale
fly scale memory 512         # Set memory to 512MB
fly scale count 1            # Set machine count

# Secrets
fly secrets list             # List secret names
fly secrets set KEY=value    # Set secret
fly secrets unset KEY        # Remove secret

# Monitoring
fly dashboard                # Open web dashboard
fly open                     # Open app in browser
fly doctor                   # Check for issues
```

## Support

- **Fly.io Docs**: https://fly.io/docs
- **Fly.io Community**: https://community.fly.io
- **PomaBot Issues**: https://github.com/yourusername/pomabot/issues

## Next Steps

After successful deployment:

1. Monitor logs for first 24 hours
2. Verify Slack notifications are working
3. Check audit logs are being created
4. Test API endpoints
5. Set up Logtail (optional)
6. Configure Git-based log backups (optional)
7. Proceed to Phase 4 (Real Trading) when ready

---

**Note**: Always test in simulation mode first before enabling live trading with real funds.
