import * as cdk from 'aws-cdk-lib'
import { type Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as cloudfrontOrigins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import * as path from 'path'

export class N64MkdocsStack extends cdk.Stack {
  constructor (scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const certificateArn = this.node.tryGetContext('certificate_arn')
    const hostedZoneId = this.node.tryGetContext('hosted_zone_id')
    const hostedZoneName = this.node.tryGetContext('hosted_zone_name')

    const domainName = `n64.${hostedZoneName}`

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      zoneName: hostedZoneName,
      hostedZoneId
    })
    const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', certificateArn)

    const logBucket = new s3.Bucket(this, 'LogBucket', {
      autoDeleteObjects: true,
      accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30)
        }
      ]
    })

    const bucket = new s3.Bucket(this, 'Bucket', {
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      serverAccessLogsBucket: logBucket,
      serverAccessLogsPrefix: 'bucket'
    })

    new ssm.StringParameter(this, 'BucketName', {
      stringValue: bucket.bucketName,
      parameterName: '/n64-mkdocs/bucket/bucket-name'
    })

    const addIndexFileFunction = new cloudfront.Function(this, 'AddIndexFileFunction', {
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, '../src/add-index-file.js')
      })
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3StaticWebsiteOrigin(bucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: addIndexFileFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
          }
        ]
      },
      logBucket,
      logFilePrefix: 'cdn',
      certificate,
      domainNames: [domainName]
    })

    new route53.ARecord(this, 'ARecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
      recordName: 'n64'
    })
    new route53.AaaaRecord(this, 'AaaaRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new route53Targets.CloudFrontTarget(distribution)),
      recordName: 'n64'
    })
  }
}
