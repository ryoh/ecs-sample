import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { LogBucket } from './log-bucket';
import { Network } from './network';

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const network = new Network(this, 'ECSNetwork');
    const vpc = network.vpc;

    // LoadBalancer
    const lb = new elv2.NetworkLoadBalancer(this, 'EcsLoadBalancer', {
      vpc,
      internetFacing: false,
    });
    // AccessLog
    const accessLogBucket = new LogBucket(this, 'EcsLoadBalancerAccessLog');
    lb.logAccessLogs(accessLogBucket.bucket);
    // SecurityGroup
    const lbsg = new ec2.SecurityGroup(this, 'EcsServiceSecurityGroup', {
      vpc,
      allowAllOutbound: true,
    });
    lbsg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'For Application Port');
    NagSuppressions.addResourceSuppressions(lbsg, [
      {
        id: 'AwsSolutions-EC23',
        reason: '内向けNLBのため、一旦全開放状態とする。可能であればAPIGatewayからのアクセスに絞ること',
      },
    ]);
  }
}
