import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

export const register = new client.Registry();

register.setDefaultLabels({
    app: 'cropfresh-service-notification',
    service: 'notification-service'
});

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10]
});
register.registerMetric(httpRequestDuration);

export const httpRequestTotal = new client.Counter({
    name: 'http_request_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestTotal);

export const grpcRequestDuration = new client.Histogram({
    name: 'grpc_request_duration_seconds',
    help: 'Duration of gRPC requests in seconds',
    labelNames: ['service', 'method', 'status_code'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10]
});
register.registerMetric(grpcRequestDuration);

export const grpcRequestTotal = new client.Counter({
    name: 'grpc_request_total',
    help: 'Total number of gRPC requests',
    labelNames: ['service', 'method', 'status_code']
});
register.registerMetric(grpcRequestTotal);

// Notification-specific metrics
export const smsDeliveryTotal = new client.Counter({
    name: 'sms_delivery_total',
    help: 'Total number of SMS notifications sent',
    labelNames: ['status', 'language']
});
register.registerMetric(smsDeliveryTotal);

export const pushDeliveryTotal = new client.Counter({
    name: 'push_delivery_total',
    help: 'Total number of push notifications sent',
    labelNames: ['status']
});
register.registerMetric(pushDeliveryTotal);

export const templateUsageTotal = new client.Counter({
    name: 'template_usage_total',
    help: 'Total number of template usages',
    labelNames: ['template_type', 'language']
});
register.registerMetric(templateUsageTotal);

export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        const status = res.statusCode.toString();
        httpRequestDuration.labels(req.method, route, status).observe(duration);
        httpRequestTotal.labels(req.method, route, status).inc();
    });
    next();
};

export const metricsHandler = async (req: Request, res: Response) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
};
