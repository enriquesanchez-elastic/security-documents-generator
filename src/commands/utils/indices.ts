import { Client } from '@elastic/elasticsearch';
import { ConfigType, getConfig } from '../../get_config';
import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';
import { exec } from 'child_process';
import { chunk, once } from 'lodash-es';
import { createProgressBar } from './cli_utils';

export * from './create_agent_document';

let esClient: Client;

const getClientAuth = (config: ConfigType) => {
  // Support both API key and basic auth
  if ('apiKey' in config.elastic) {
    return {
      apiKey: config.elastic.apiKey,
    };
  } else {
    return {
      username: config.elastic.username,
      password: config.elastic.password,
    };
  }
};

export const getEsClient = () => {
  if (esClient) return esClient;
  const config = getConfig();

  once(() => console.log('Elasticsearch node:', config.elastic.node));

  esClient = new Client({
    node: config.elastic.node,
    auth: getClientAuth(config),
    tls: {
      rejectUnauthorized: false, // Accept self-signed certificates for serverless dev
    },
  });

  return esClient;
};

export const getFileLineCount = async (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    exec(`wc -l ${filePath}`, (error, stdout, stderr) => {
      if (error || stderr) {
        reject(error || stderr);
      }

      const count = parseInt(stdout.trim().split(' ')[0]);

      if (isNaN(count)) {
        console.log(
          `Failed to parse line count, line count: "${stdout}", split result: "${stdout.split(' ')}"`,
        );
        reject();
      }
      resolve(count);
    });
  });
};

export const indexCheck = async (
  index: string,
  body?: Omit<IndicesCreateRequest, 'index'>,
  quiet = false,
) => {
  const client = getEsClient();
  if (!client) {
    throw new Error();
  }

  // Check if this is a logs index that needs to be a data stream
  const isLogsIndex = index.startsWith('logs-');
  const isKnowledgeBaseIndex = index.includes('knowledge-base');

  if (isLogsIndex) {
    // For logs indices, check if data stream exists
    try {
      // Check if data stream exists by attempting to get its stats
      const exists = await client.indices
        .getDataStream({ name: index })
        .then(() => true)
        .catch(() => false);

      if (exists) return;

      if (!quiet) console.log('Data stream does not exist, creating...');

      // Create data stream
      await client.indices.createDataStream({ name: index });
      if (!quiet) console.log('Data stream created', index);
      return;
    } catch (error) {
      console.log('Data stream creation failed', JSON.stringify(error));
      throw error;
    }
  } else {
    // Regular index check
    const isExist = await client.indices.exists({ index: index });
    if (isExist) return;

    if (!quiet) console.log('Index does not exist, creating...');

    try {
      const indexSettings = {
        index: index,
        settings: {
          'index.mapping.total_fields.limit': 10000,
        },
        ...body,
      };

      // For knowledge base indices, add specific settings for semantic text
      if (isKnowledgeBaseIndex) {
        indexSettings.settings = {
          ...indexSettings.settings,
          'index.mapping.nested_fields.limit': 1000,
          'index.mapping.nested_objects.limit': 10000,
        };
      }

      await client.indices.create(indexSettings);
      if (!quiet) console.log('Index created', index);
    } catch (error) {
      console.log('Index creation failed', JSON.stringify(error));
      throw error;
    }
  }
};

export const ingest = async (index: string, documents: Array<object>) => {
  const esClient = getEsClient();

  const progressBar = createProgressBar(index);

  const chunks = chunk(documents, 10000);
  progressBar.start(documents.length, 0);

  const isDataStream = index.startsWith('logs-');

  for (const chunk of chunks) {
    try {
      // For data streams, we need to use create operation instead of index
      const operations = chunk.flatMap((doc) => {
        if (isDataStream) {
          return [
            { create: { _index: index } }, // create for data streams
            doc,
          ];
        } else {
          return [
            { index: { _index: index } }, // index for regular indices
            doc,
          ];
        }
      });

      await esClient.bulk({ operations, refresh: true });
      progressBar.increment(chunk.length);
    } catch (err) {
      console.log('Error: ', err);
    }
  }
  progressBar.stop();
};
