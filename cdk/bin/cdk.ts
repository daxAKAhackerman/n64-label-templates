#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { N64MkdocsStack } from '../lib/n64-mkdocs-stack'

const app = new cdk.App()
new N64MkdocsStack(app, 'n64-mkdocs')
