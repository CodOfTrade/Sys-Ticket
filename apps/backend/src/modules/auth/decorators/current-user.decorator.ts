import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Se um campo específico foi solicitado (ex: 'id'), retorna apenas esse campo
    // Caso contrário, retorna o objeto user completo
    return data ? user?.[data] : user;
  },
);
