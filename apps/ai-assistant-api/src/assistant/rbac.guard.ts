import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import type { ActorContext } from "@yoryi/ai-types";

@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as Record<string, unknown>;
    const actionKey = request.body?.actionKey;
    const requiredPermissions = this.getRequiredPermissionsForAction(actionKey);
    const actorContext = this.extractActorContext(request);

    if (!actorContext || !actorContext.permissions || actorContext.permissions.length === 0) {
      throw new ForbiddenException("Permisos insuficientes");
    }

    const hasAllPermissions = requiredPermissions.every((perm) =>
      actorContext.permissions.includes(perm)
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter(
        (perm) => !actorContext.permissions.includes(perm)
      );
      throw new ForbiddenException(`Permiso requerido: ${missing.join(", ")}`);
    }

    return true;
  }

  private getRequiredPermissionsForAction(actionKey?: string): string[] {
    const actionPermissionsMap: Record<string, string[]> = {
      "charges.create": ["charges.write"],
      "charges.publish": ["charges.publish"],
      "payments.approve": ["payments.approve"],
      "buildings.update": ["buildings.write"],
      "units.update": ["units.write"],
    };

    return actionPermissionsMap[actionKey ?? ""] ?? [];
  }

  private extractActorContext(request: Record<string, unknown>): ActorContext | undefined {
    const authContext = request.authContext as Record<string, unknown>;
    if (!authContext) {
      return undefined;
    }

    return {
      actorId: (authContext.userId as string) ?? "",
      userId: (authContext.userId as string) ?? "",
      permissions: (authContext.permissions as string[]) ?? [],
      roles: (authContext.roles as string[]) ?? [],
    };
  }
}