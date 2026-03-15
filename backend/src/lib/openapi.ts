import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';

export const registry = new OpenAPIRegistry();

export const generateOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.2.0',
    info: {
      title: 'Edu-Hub API documentation',
      version: '1.0.0',
    },
  });
};
