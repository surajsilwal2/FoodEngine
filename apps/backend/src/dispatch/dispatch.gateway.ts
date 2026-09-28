import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService, UserRole } from '@foodengine/database';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Keep browser access limited to configured application origins. Native clients
// are authenticated separately through the JWT handshake below.
@WebSocketGateway({
  namespace: '/dispatch',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class DispatchGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DispatchGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // @websocketserver gives us access to the socket.io server instance
  @WebSocketServer()
  server: Server;

  // Authenticate at connection time so subsequent room joins can use the verified socket identity instead of trusting a client-supplied user ID.
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client); // grabs the token from handshake
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email: string;
        role: UserRole;
      }>(token);  // verifies if token is legit or not.
        
        // attach the verified user date to socket's memory
      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      this.logger.log(`Authenticated dispatch socket ${client.id}`);
    } catch {
      this.logger.warn(`Rejected unauthenticated dispatch socket ${client.id}`);
      client.disconnect(true); // if not legit, remove the user
    }
  }

  // runs automatically when a client disconnects
  handleDisconnect(client: Socket) {
    this.logger.log(`Dispatch socket disconnected: ${client.id}`);
  }

  // The authenticated driver can join only their own profile room. No room ID
  // is accepted from the client, preventing one driver from reading another's offers.
  @SubscribeMessage('driver:subscribe')
  async handleDriverSubscribe(@ConnectedSocket() client: Socket) {
    const user = this.requireAuthenticatedUser(client); // get the trusted user object
    if (user.role !== UserRole.DRIVER) {
      throw new ForbiddenException(
        'Only drivers can subscribe to delivery offers',
      );
      }
      
      // check if the driver is approved or not?
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: user.userId },
      select: { id: true, isApproved: true },
    });
    if (!profile?.isApproved) {
      throw new ForbiddenException('Approved driver profile required');
    }

      // put this specific socket in private room.
    const roomName = `driver:${profile.id}`;
    await client.join(roomName);
    this.logger.log(`Driver socket ${client.id} joined ${roomName}`);
    return { event: 'subscribed', room: roomName };
  }

  // A customer may subscribe only to an order they own; this keeps order
  // status and delivery information private even when order IDs are guessable.
  @SubscribeMessage('order:subscribe')
  async handleOrderSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: number },
  ) {
    const user = this.requireAuthenticatedUser(client);
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      select: { customerId: true },
    });
    if (!order || order.customerId !== user.userId) {
      throw new ForbiddenException('You cannot subscribe to this order');
    }
    const roomName = `order:${data.orderId}`;
    await client.join(roomName);
    this.logger.log(`Customer socket ${client.id} joined ${roomName}`);
    return { event: 'subscribed', room: roomName };
  }

  // The room key is a driver profile ID, matching the member stored in Redis.
  notifyDriverNewOffer(driverProfileId: number, deliveryData: unknown) {
    const roomName = `driver:${driverProfileId}`;
    // send this data to everyone in the 'driver:X' room
    this.server.to(roomName).emit('delivery:offer', deliveryData);
    this.logger.log(`Pushed delivery offer to ${roomName}`);
  }

  // push order status changes to customer(eg- preparation, pickedup)
  notifyOrderStatus(orderId: number, statusData: unknown) {
    const roomName = `order:${orderId}`;
    this.server.to(roomName).emit('order:status_changed', statusData);
    this.logger.log(`Pushed status update to ${roomName}`);
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    const authorization = client.handshake.headers.authorization;
    const headerToken =
      typeof authorization === 'string'
        ? authorization.replace(/^Bearer\s+/i, '')
        : undefined;
    const token =
      typeof authToken === 'string'
        ? authToken.replace(/^Bearer\s+/i, '')
        : headerToken;
    if (!token)
      throw new UnauthorizedException('JWT is required for dispatch socket');
    return token;
  }

  private requireAuthenticatedUser(client: Socket): {
    userId: number;
    email: string;
    role: UserRole;
  } {
    const user = client.data.user;
    if (!user) throw new UnauthorizedException('Socket is not authenticated');
    return user;
  }
}
