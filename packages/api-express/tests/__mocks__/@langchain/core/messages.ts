class BaseMessage {
  content: string;
  constructor(content: string) {
    this.content = content;
  }
}
class HumanMessage extends BaseMessage {}
class SystemMessage extends BaseMessage {}
class AIMessage extends BaseMessage {}

export { HumanMessage, SystemMessage, AIMessage, BaseMessage };
