import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { LoyaltyLedger, User } from '../entities/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(LoyaltyLedger) private readonly ledger: Repository<LoyaltyLedger>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: { username: string; email: string; password: string }) {
    const exists = await this.users.findOne({
      where: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
    });
    if (exists) throw new ConflictException('Usuario o email ya registrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = (await this.users.save({
      username: dto.username.toLowerCase().trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      role: 'client',
    } as any)) as User;
    return this.tokenResponse(user);
  }

  async login(dto: { identifier: string; password: string }) {
    const id = dto.identifier.trim().toLowerCase();
    const user = await this.users.findOne({
      where: [{ email: id }, { username: id }],
    });
    if (!user) throw new UnauthorizedException('Usuario o contraseña no coinciden');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Usuario o contraseña no coinciden');
    return this.tokenResponse(user);
  }

  async derivedPoints(userId: string): Promise<number> {
    const rows = await this.ledger.find({ where: { userId } });
    return rows.reduce((s, r) => s + (r.points || 0), 0);
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const points = await this.derivedPoints(userId);
    return { user: { ...this.toAuthUser(user), points }, points };
  }

  private async tokenResponse(user: User) {
    const points = await this.derivedPoints(user.id);
    const payload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: { ...this.toAuthUser(user), points },
    };
  }

  toAuthUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }
}
