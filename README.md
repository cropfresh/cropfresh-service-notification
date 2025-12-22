<<<<<<< HEAD
# CropFresh Notification Service

SMS, push notifications, and multi-language template management for CropFresh platform.

## Features

- **SMS Delivery** - Twilio/AWS SNS integration (mock in Phase 1)
- **Push Notifications** - Firebase Cloud Messaging
- **Multi-Language Templates** - Kannada, Hindi, Tamil, Telugu, English
- **Delivery Tracking** - Status tracking and retry logic
- **User Preferences** - Per-user notification settings

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations (requires PostgreSQL)
npx prisma migrate dev

# Start development server
npm run dev
```

## Ports

- HTTP: 3008
- gRPC: 50058

## API

### gRPC Methods

| Method | Description |
|--------|-------------|
| `SendSMS` | Send SMS notification |
| `SendPush` | Send push notification |
| `SendTemplatedNotification` | Send using template |
| `GetDeliveryStatus` | Check delivery status |
| `SendBatchNotification` | Bulk send |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | 3008 |
| `GRPC_PORT` | gRPC port | 50058 |
| `DATABASE_URL` | PostgreSQL connection | - |
| `SMS_PROVIDER` | `mock` or `twilio` | mock |
| `PUSH_PROVIDER` | `mock` or `fcm` | mock |

## License

ISC
=======
# cropfresh-service-notification
>>>>>>> 998d97c3754a562ed80f2a0dedef27abe2d9137e
