"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacGuard = void 0;
const common_1 = require("@nestjs/common");
let RbacGuard = class RbacGuard {
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const actionKey = request.body?.actionKey;
        const requiredPermissions = this.getRequiredPermissionsForAction(actionKey);
        const actorContext = this.extractActorContext(request);
        if (!actorContext || !actorContext.permissions || actorContext.permissions.length === 0) {
            throw new common_1.ForbiddenException("Permisos insuficientes");
        }
        const hasAllPermissions = requiredPermissions.every((perm) => actorContext.permissions.includes(perm));
        if (!hasAllPermissions) {
            const missing = requiredPermissions.filter((perm) => !actorContext.permissions.includes(perm));
            throw new common_1.ForbiddenException(`Permiso requerido: ${missing.join(", ")}`);
        }
        return true;
    }
    getRequiredPermissionsForAction(actionKey) {
        const actionPermissionsMap = {
            "charges.create": ["charges.write"],
            "charges.publish": ["charges.publish"],
            "payments.approve": ["payments.approve"],
            "buildings.update": ["buildings.write"],
            "units.update": ["units.write"],
        };
        return actionPermissionsMap[actionKey ?? ""] ?? [];
    }
    extractActorContext(request) {
        const authContext = request.authContext;
        if (!authContext) {
            return undefined;
        }
        return {
            actorId: authContext.userId ?? "",
            userId: authContext.userId ?? "",
            permissions: authContext.permissions ?? [],
            roles: authContext.roles ?? [],
        };
    }
};
exports.RbacGuard = RbacGuard;
exports.RbacGuard = RbacGuard = __decorate([
    (0, common_1.Injectable)()
], RbacGuard);
