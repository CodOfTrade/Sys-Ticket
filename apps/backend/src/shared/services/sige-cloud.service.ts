import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';

@Injectable()
export class SigeCloudService {
  private readonly logger = new Logger(SigeCloudService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('SIGE_API_URL') || 'https://api.sigecloud.com.br';
    this.apiKey = this.configService.get<string>('SIGE_API_KEY') || '';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`SIGE Cloud Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('SIGE Cloud Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`SIGE Cloud Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError) => {
        this.logger.error(`SIGE Cloud Error: ${error.message}`, error.response?.data);
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): HttpException {
    const status = error.response?.status || 500;
    const message = error.response?.data || error.message || 'Erro ao comunicar com SIGE Cloud';

    return new HttpException(
      {
        statusCode: status,
        message: message,
        error: 'SIGE Cloud API Error',
      },
      status
    );
  }

  async get<T>(endpoint: string, params?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(endpoint, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = await this.axiosInstance.patch<T>(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(endpoint);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
