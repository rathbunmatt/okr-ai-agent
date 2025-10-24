// Mock PromptTemplateService for testing
export class MockPromptTemplateService {
  async getTemplate(templateId: string, context?: any): Promise<any> {
    return {
      id: templateId,
      content: `Mock template for ${templateId}`,
      variables: [],
      metadata: {
        phase: context?.phase || 'discovery',
        strategy: context?.strategy || 'default'
      }
    };
  }

  async renderTemplate(templateId: string, variables: any): Promise<string> {
    return `Mock rendered template: ${templateId}`;
  }
}
