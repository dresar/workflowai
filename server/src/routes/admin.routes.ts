import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/admin-auth.middleware';
import * as dashboardController from '../modules/admin/dashboard/dashboard.controller';
import * as providerController from '../modules/admin/provider/provider.controller';
import * as rotationController from '../modules/admin/rotation/rotation.controller';
import * as promptTemplateController from '../modules/admin/prompt-template/prompt-template.controller';
import * as logsController from '../modules/admin/logs/logs.controller';
import * as settingsController from '../modules/admin/settings/settings.controller';
import * as technologyController from '../modules/technology/technology.controller';
import * as usersController from '../modules/admin/users/users.controller';

const router = Router();
router.use(adminAuthMiddleware);

router.get('/dashboard/stats', dashboardController.getStats);
router.get('/dashboard/ai-usage', dashboardController.getAIUsageChart);
router.get('/dashboard/provider-distribution', dashboardController.getProviderDistribution);

router.get('/users', usersController.listUsers);
router.post('/users', usersController.createUser);
router.put('/users/:id', usersController.updateUser);
router.delete('/users/:id', usersController.deleteUser);

router.get('/providers', providerController.listProviders);
router.post('/providers', providerController.createProvider);
router.put('/providers/:id', providerController.updateProvider);
router.delete('/providers/:id', providerController.deleteProvider);

router.get('/api-keys', providerController.listApiKeys);
router.post('/api-keys', providerController.createApiKey);
router.put('/api-keys/:id', providerController.updateApiKey);
router.delete('/api-keys/:id', providerController.deleteApiKey);
router.post('/api-keys/:id/reset-quota', providerController.resetApiKeyQuota);

router.get('/rotation', rotationController.getRotationConfig);
router.put('/rotation', rotationController.updateRotationConfig);

router.get('/technologies', technologyController.listTechnologies);
router.post('/technologies', technologyController.createTechnology);
router.put('/technologies/:id', technologyController.updateTechnology);
router.delete('/technologies/:id', technologyController.deleteTechnology);
router.patch('/technologies/:id/toggle', technologyController.toggleTechnology);

router.get('/prompt-templates', promptTemplateController.listPromptTemplates);
router.get('/prompt-templates/:type', promptTemplateController.getPromptTemplateByType);
router.put('/prompt-templates/:id', promptTemplateController.updatePromptTemplate);
router.post('/prompt-templates/:id/publish', promptTemplateController.publishPromptTemplate);

router.get('/monitoring/realtime', logsController.getMonitoringRealtime);
router.get('/monitoring/area-chart', logsController.getAreaChart);

router.get('/logs/activity', logsController.getActivityLogs);
router.get('/logs/requests', logsController.getRequestLogs);

router.get('/settings', settingsController.getAllSettings);
router.put('/settings', settingsController.updateSettings);
router.get('/settings/:key', settingsController.getSetting);
router.put('/settings/:key', settingsController.updateSetting);

export default router;
