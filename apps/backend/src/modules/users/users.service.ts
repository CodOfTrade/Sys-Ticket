import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { QueryUsersDto } from './dto/query-users.dto';

interface PaginatedUsersResult {
  data: User[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAllPaginated(query: QueryUsersDto): Promise<PaginatedUsersResult> {
    const {
      page = 1,
      perPage = 20,
      search,
      role,
      customRoleId,
      status,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = query;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.custom_role', 'custom_role');

    // Filtro de busca por nome ou email
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(user.name) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    // Filtro por role base
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    // Filtro por custom_role_id
    if (customRoleId) {
      queryBuilder.andWhere('user.custom_role_id = :customRoleId', { customRoleId });
    }

    // Filtro por status
    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // Ordenacao
    const validSortFields = ['name', 'email', 'role', 'status', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    queryBuilder.orderBy(`user.${sortField}`, sortOrder);

    // Contagem total
    const total = await queryBuilder.getCount();

    // Paginacao
    const skip = (page - 1) * perPage;
    queryBuilder.skip(skip).take(perPage);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['custom_role'] });
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'password', 'role', 'status', 'service_desk_ids'],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, userData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async findTechnicians(): Promise<User[]> {
    return this.usersRepository.find({
      where: [
        { role: 'agent' as any, status: 'active' as any },
        { role: 'manager' as any, status: 'active' as any },
        { role: 'admin' as any, status: 'active' as any },
      ],
      select: ['id', 'name', 'email', 'role', 'avatar_url', 'status'],
    });
  }
}
