import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from '../entities/resource.entity';

@Injectable()
export class AgentTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['x-agent-token'];

    if (!token) {
      throw new UnauthorizedException('Token do agente não fornecido');
    }

    const resource = await this.resourceRepository.findOne({
      where: { agent_token: token },
    });

    if (!resource) {
      throw new UnauthorizedException('Token do agente inválido');
    }

    // Injeta o resource no request para uso posterior
    request.agentResource = resource;
    request.agentId = resource.agent_id;

    return true;
  }
}
