import { RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export class LogBucket {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    this.bucket = new s3.Bucket(scope, id, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    NagSuppressions.addResourceSuppressions(this.bucket, [
      {
        id: 'AwsSolutions-S1',
        reason: 'Bucket for storing access logs, so no access logs are needed for this bucket itself.',
      },
    ]);
  }
}
