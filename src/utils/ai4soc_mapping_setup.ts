/**
 * AI4SOC Elasticsearch Mapping Setup Utility
 * 
 * Creates and manages index templates for AI4SOC platform-specific alerts
 */

import { getEsClient } from '../commands/utils/indices';
import splunkMappings from '../mappings/ai4soc_splunk_mappings.json' assert { type: 'json' };
import sentineloneMappings from '../mappings/ai4soc_sentinelone_mappings.json' assert { type: 'json' };
import googleSecOpsMappings from '../mappings/ai4soc_google_secops_mappings.json' assert { type: 'json' };

export interface AI4SOCMappingConfig {
  platform: 'splunk' | 'sentinelone' | 'google-secops';
  space?: string;
  createTemplate?: boolean;
}

/**
 * Get the appropriate mapping for an AI4SOC platform
 */
function getMappingForPlatform(platform: string) {
  switch (platform) {
    case 'splunk':
      return splunkMappings;
    case 'sentinelone':
      return sentineloneMappings;
    case 'google-secops':
      return googleSecOpsMappings;
    default:
      throw new Error(`Unsupported AI4SOC platform: ${platform}`);
  }
}

/**
 * Setup AI4SOC index template for a specific platform
 */
export async function setupAI4SOCIndexTemplate(
  platform: 'splunk' | 'sentinelone' | 'google-secops',
  space: string = 'default'
): Promise<void> {
  const client = getEsClient();
  const templateName = `ai4soc-${platform}-template`;
  const indexPattern = `ai4soc-${platform}-${space}`;

  console.log(`🔧 Setting up AI4SOC ${platform} index template...`);

  try {
    // Get platform-specific mapping
    const mapping = getMappingForPlatform(platform);

    // Create index template
    await client.indices.putIndexTemplate({
      name: templateName,
      index_patterns: [`ai4soc-${platform}-*`],
      template: {
        settings: {
          'index.number_of_shards': 1,
          'index.number_of_replicas': 0,
          'index.refresh_interval': '30s',
          'index.max_result_window': 50000,
        },
        mappings: mapping as any, // Cast to any to avoid strict typing
      },
      priority: 200,
      version: 1,
      _meta: {
        description: `AI4SOC ${platform} alert template`,
        created_by: 'security-documents-generator',
        platform: platform,
      },
    });

    console.log(`✅ Created index template: ${templateName}`);
    console.log(`📋 Index pattern: ai4soc-${platform}-*`);

    // Check if index exists, if not create it
    const indexExists = await client.indices.exists({ index: indexPattern });
    if (!indexExists) {
      await client.indices.create({ index: indexPattern });
      console.log(`✅ Created index: ${indexPattern}`);
    } else {
      console.log(`📋 Index already exists: ${indexPattern}`);
    }

  } catch (error) {
    console.error(`❌ Failed to setup AI4SOC ${platform} template:`, error);
    throw error;
  }
}

/**
 * Setup all AI4SOC index templates
 */
export async function setupAllAI4SOCMappings(space: string = 'default'): Promise<void> {
  console.log('🚀 Setting up all AI4SOC index templates...\n');

  const platforms: Array<'splunk' | 'sentinelone' | 'google-secops'> = [
    'splunk',
    'sentinelone', 
    'google-secops'
  ];

  for (const platform of platforms) {
    try {
      await setupAI4SOCIndexTemplate(platform, space);
      console.log(); // Add spacing between platforms
    } catch (error) {
      console.error(`❌ Failed to setup ${platform} mapping:`, error);
    }
  }

  console.log('✅ AI4SOC mapping setup completed!\n');
  console.log('📋 Available AI4SOC indices:');
  console.log(`   • ai4soc-splunk-${space}`);
  console.log(`   • ai4soc-sentinelone-${space}`);
  console.log(`   • ai4soc-google-secops-${space}`);
  
  console.log('\n🔍 Use these index patterns in Kibana:');
  console.log('   • ai4soc-splunk-*');
  console.log('   • ai4soc-sentinelone-*');
  console.log('   • ai4soc-google-secops-*');
  console.log('   • ai4soc-*-* (for all platforms)');
}

/**
 * Delete AI4SOC index templates and indices
 */
export async function deleteAI4SOCMappings(space: string = 'default'): Promise<void> {
  const client = getEsClient();
  console.log('🗑️ Cleaning up AI4SOC indices and templates...\n');

  const platforms = ['splunk', 'sentinelone', 'google-secops'];

  for (const platform of platforms) {
    try {
      const templateName = `ai4soc-${platform}-template`;
      const indexPattern = `ai4soc-${platform}-${space}`;

      // Delete index template
      try {
        await client.indices.deleteIndexTemplate({ name: templateName });
        console.log(`✅ Deleted template: ${templateName}`);
      } catch (error: any) {
        if (error.statusCode !== 404) {
          console.warn(`⚠️ Failed to delete template ${templateName}:`, error.message);
        }
      }

      // Delete index
      try {
        const indexExists = await client.indices.exists({ index: indexPattern });
        if (indexExists) {
          await client.indices.delete({ index: indexPattern });
          console.log(`✅ Deleted index: ${indexPattern}`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Failed to delete index ${indexPattern}:`, error.message);
      }

    } catch (error) {
      console.error(`❌ Error cleaning up ${platform}:`, error);
    }
  }

  console.log('\n🧹 AI4SOC cleanup completed!');
}

/**
 * Get AI4SOC index status
 */
export async function getAI4SOCStatus(space: string = 'default'): Promise<void> {
  const client = getEsClient();
  console.log('📊 AI4SOC Index Status:\n');

  const platforms = ['splunk', 'sentinelone', 'google-secops'];

  for (const platform of platforms) {
    try {
      const indexPattern = `ai4soc-${platform}-${space}`;
      const templateName = `ai4soc-${platform}-template`;

      // Check template
      let templateExists = false;
      try {
        await client.indices.getIndexTemplate({ name: templateName });
        templateExists = true;
      } catch {
        templateExists = false;
      }

      // Check index and get document count
      let indexExists = false;
      let docCount = 0;
      try {
        indexExists = await client.indices.exists({ index: indexPattern });
        if (indexExists) {
          const count = await client.count({ index: indexPattern });
          docCount = count.count;
        }
      } catch {
        indexExists = false;
      }

      console.log(`📋 Platform: ${platform.toUpperCase()}`);
      console.log(`   Template: ${templateExists ? '✅' : '❌'} ${templateName}`);
      console.log(`   Index: ${indexExists ? '✅' : '❌'} ${indexPattern}`);
      if (indexExists) {
        console.log(`   Documents: ${docCount}`);
      }
      console.log();

    } catch (error) {
      console.error(`❌ Error checking ${platform}:`, error);
    }
  }
}