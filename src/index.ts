// Tracing (Must be first)
import './tracing';

import { GrpcServer } from './grpc/server';
import { notificationServiceHandlers } from './grpc/services/notification';
import path from 'path';
import express from 'express';
import { logger } from './utils/logger';
import { requestLogger, traceIdMiddleware } from './middleware/logging';
import { monitoringMiddleware, metricsHandler } from './middleware/monitoring';
import { prisma } from './lib/prisma';
import { livenessHandler, createReadinessHandler } from './middleware/health';

const app = express();

const PORT = process.env.PORT || 3008;
const SERVICE_NAME = 'Notification Service';

// Middleware
app.use(express.json());
app.use(monitoringMiddleware);
app.use(traceIdMiddleware);
app.use(requestLogger);

// Health check endpoints (Kubernetes probes)
app.get('/health', livenessHandler);
app.get('/ready', createReadinessHandler(prisma));

// Metrics Endpoint
app.get('/metrics', metricsHandler);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: SERVICE_NAME,
        version: '0.1.0',
        status: 'running'
    });
});

// Start HTTP server
app.listen(PORT, () => {
    logger.info(`${SERVICE_NAME} running on port ${PORT}`);
});

export default app;

// gRPC Server Setup
const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50058', 10);
const PROTO_PATH = path.join(__dirname, '../protos/proto/notification.proto');
const PACKAGE_NAME = 'cropfresh.notification';
const SERVICE_NAME_GRPC = 'NotificationService';

(async () => {
    try {
        const grpcServer = new GrpcServer(GRPC_PORT, logger);
        const packageDef = grpcServer.loadProto(PROTO_PATH);
        const proto = packageDef.cropfresh.notification as any;
        const serviceDef = proto[SERVICE_NAME_GRPC].service;

        grpcServer.addService(serviceDef, notificationServiceHandlers(logger));

        await grpcServer.start();
        logger.info(`gRPC server started on port ${GRPC_PORT}`);
    } catch (err) {
        logger.error(err, 'Failed to start gRPC server');
    }
})();
