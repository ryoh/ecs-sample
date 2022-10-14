import { Stack, StackProps } from 'aws-cdk-lib';
import * as elv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { LogBucket } from './log-bucket';
import { Network } from './network';

/**
 * Create VPC and LoadBalancer Resource
 */
export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // VPC and VPCEndpoint
    const network = new Network(this, 'EcsNetwork');
    const vpc = network.vpc;

    // LoadBalancer
    const lb = new elv2.NetworkLoadBalancer(this, 'EcsLoadBalancer', {
      vpc,
      internetFacing: false,
    });
    // AccessLog
    const accessLogBucket = new LogBucket(this, 'EcsLoadBalancerAccessLog');
    lb.logAccessLogs(accessLogBucket.bucket);
  }
}
