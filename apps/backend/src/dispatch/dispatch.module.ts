import { Module } from '@nestjs/common';
import { DispatchGateway } from './dispatch.gateway.js';

@Module({
  providers: [DispatchGateway],
  exports: [DispatchGateway],
})
export class DispatchModule {}
