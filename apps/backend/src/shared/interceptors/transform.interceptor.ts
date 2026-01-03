import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any;
  errors?: any[];
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        // Se a resposta já estiver no formato correto, retorne-a
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Caso contrário, transforme para o formato padrão
        return {
          success: true,
          data,
          errors: [],
        };
      }),
    );
  }
}
