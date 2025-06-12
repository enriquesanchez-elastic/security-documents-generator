import { vi } from 'vitest';

// Mock OpenAI Client
export const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

// Mock Anthropic Client  
export const mockAnthropic = {
  messages: {
    create: vi.fn(),
  },
};

// Mock constructors
export const MockOpenAI = vi.fn(() => mockOpenAI);
export const MockAnthropic = vi.fn(() => mockAnthropic);

// Mock the actual modules
vi.mock('openai', () => ({
  OpenAI: MockOpenAI,
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: MockAnthropic,
}));

// Helper functions for test scenarios
export const mockSuccessfulOpenAIResponse = (jsonContent: any) => {
  mockOpenAI.chat.completions.create.mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify(jsonContent),
        },
      },
    ],
  });
};

export const mockSuccessfulClaudeResponse = (jsonContent: any) => {
  mockAnthropic.messages.create.mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify(jsonContent),
      },
    ],
  });
};

export const mockFailedOpenAIResponse = (error: Error) => {
  mockOpenAI.chat.completions.create.mockRejectedValue(error);
};

export const mockFailedClaudeResponse = (error: Error) => {
  mockAnthropic.messages.create.mockRejectedValue(error);
};

export const resetAllMocks = () => {
  vi.clearAllMocks();
  mockOpenAI.chat.completions.create.mockReset();
  mockAnthropic.messages.create.mockReset();
};