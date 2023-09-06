SHELL := /usr/bin/env bash
CDK_DIR := cdk
ASSETS_BUCKET_NAME = $(shell aws ssm get-parameter --name /n64-mkdocs/bucket/bucket-name --query Parameter.Value --output text)

install:
	@python3 -m pip install pipenv -U
	@python3 -m pipenv install --dev
	@python3 -m pipenv run pre-commit install
	@npm install --prefix $(CDK_DIR)

lint:
	@npm run --prefix $(CDK_DIR) lint

run:
	@pipenv run mkdocs serve

build:
	@pipenv run mkdocs build

upload: build
	@aws s3 sync site s3://$(ASSETS_BUCKET_NAME)
	@aws s3 sync google-site-verification s3://$(ASSETS_BUCKET_NAME)

synth:
	@cd $(CDK_DIR) && npx cdk synth

deploy:
	@cd $(CDK_DIR) && npx cdk deploy
