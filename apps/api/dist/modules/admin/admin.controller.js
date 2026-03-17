"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    getStats(telegramId) {
        return this.adminService.getStats(telegramId);
    }
    listUsers(query) {
        return this.adminService.listUsers(query);
    }
    getUserDetails(telegramId, id) {
        return this.adminService.getUserDetails(telegramId, id);
    }
    listShifts(telegramId) {
        return this.adminService.listShifts(telegramId);
    }
    listIncidents(telegramId) {
        return this.adminService.listIncidents(telegramId);
    }
    listSubscriptions(telegramId) {
        return this.adminService.listSubscriptions(telegramId);
    }
    listPlans(telegramId) {
        return this.adminService.listPlans(telegramId);
    }
    upsertPlan(telegramId, body) {
        return this.adminService.upsertPlan(telegramId, body);
    }
    trustWorker(telegramId, id) {
        return this.adminService.trustWorker(telegramId, id);
    }
    resolveIncident(telegramId, id) {
        return this.adminService.resolveIncident(telegramId, id);
    }
    getOwnerEntitlements(telegramId, id) {
        return this.adminService.getOwnerEntitlements(telegramId, id);
    }
    assignOwnerSubscription(telegramId, id, body) {
        return this.adminService.assignOwnerSubscription(telegramId, id, body);
    }
    deleteUser(telegramId, id) {
        return this.adminService.deleteUser(telegramId, id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    __param(0, (0, common_1.Query)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUserDetails", null);
__decorate([
    (0, common_1.Get)('shifts'),
    __param(0, (0, common_1.Query)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listShifts", null);
__decorate([
    (0, common_1.Get)('incidents'),
    __param(0, (0, common_1.Query)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listIncidents", null);
__decorate([
    (0, common_1.Get)('subscriptions'),
    __param(0, (0, common_1.Query)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listSubscriptions", null);
__decorate([
    (0, common_1.Get)('plans'),
    __param(0, (0, common_1.Query)('telegramId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listPlans", null);
__decorate([
    (0, common_1.Post)('plans'),
    __param(0, (0, common_1.Query)('telegramId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "upsertPlan", null);
__decorate([
    (0, common_1.Post)('workers/:id/trust'),
    __param(0, (0, common_1.Query)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "trustWorker", null);
__decorate([
    (0, common_1.Post)('incidents/:id/resolve'),
    __param(0, (0, common_1.Query)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "resolveIncident", null);
__decorate([
    (0, common_1.Get)('owners/:id/entitlements'),
    __param(0, (0, common_1.Query)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getOwnerEntitlements", null);
__decorate([
    (0, common_1.Post)('owners/:id/subscriptions'),
    __param(0, (0, common_1.Query)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "assignOwnerSubscription", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Query)('telegramId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteUser", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
