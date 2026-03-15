/**
 * Chat Commands
 * Special commands users can type in chat
 */

export interface ChatCommand {
  /** Command name (without /) */
  name: string;
  /** Command aliases */
  aliases: string[];
  /** Command description */
  description: string;
  /** Usage example */
  usage: string;
  /** Whether requires host/admin */
  requiresPermission: boolean;
  /** Handler function */
  handler: (args: string[], context: CommandContext) => CommandResult;
}

export interface CommandContext {
  /** User who sent the command */
  userId: string;
  /** Username */
  username: string;
  /** Room ID (if in a room) */
  roomId?: string;
  /** Whether user is host */
  isHost: boolean;
  /** Whether user is admin */
  isAdmin: boolean;
}

export interface CommandResult {
  /** Whether command succeeded */
  success: boolean;
  /** Message to display */
  message: string;
  /** Whether to show as system message */
  isSystemMessage: boolean;
  /** Action to perform */
  action?: CommandAction;
}

export type CommandAction =
  | { type: 'emote'; action: string }
  | { type: 'shrug' }
  | { type: 'tableflip' }
  | { type: 'roll'; min: number; max: number; result: number }
  | { type: 'help'; commands: ChatCommand[] }
  | { type: 'clear' };

/**
 * Available chat commands
 */
export const COMMANDS: ChatCommand[] = [
  {
    name: 'me',
    aliases: ['action', 'emote'],
    description: 'Perform an action',
    usage: '/me waves hello',
    requiresPermission: false,
    handler: (args, context) => {
      const action = args.join(' ');
      if (!action) {
        return {
          success: false,
          message: 'Usage: /me <action>',
          isSystemMessage: true,
        };
      }
      return {
        success: true,
        message: `${context.username} ${action}`,
        isSystemMessage: false,
        action: { type: 'emote', action },
      };
    },
  },
  {
    name: 'shrug',
    aliases: [],
    description: 'Shrug emoji',
    usage: '/shrug',
    requiresPermission: false,
    handler: (_args, _context) => ({
      success: true,
      message: '¯\\_(ツ)_/¯',
      isSystemMessage: false,
      action: { type: 'shrug' },
    }),
  },
  {
    name: 'tableflip',
    aliases: ['flip'],
    description: 'Flip a table',
    usage: '/tableflip',
    requiresPermission: false,
    handler: (_args, _context) => ({
      success: true,
      message: '(╯°□°)╯︵ ┻━┻',
      isSystemMessage: false,
      action: { type: 'tableflip' },
    }),
  },
  {
    name: 'roll',
    aliases: ['dice', 'random'],
    description: 'Roll a random number',
    usage: '/roll [max] or /roll [min] [max]',
    requiresPermission: false,
    handler: (args, context) => {
      let min = 1;
      let max = 100;

      if (args.length === 1 && args[0]) {
        max = parseInt(args[0], 10);
        if (isNaN(max) || max < 1) {
          return {
            success: false,
            message: 'Invalid number. Usage: /roll [max]',
            isSystemMessage: true,
          };
        }
      } else if (args.length === 2 && args[0] && args[1]) {
        min = parseInt(args[0], 10);
        max = parseInt(args[1], 10);
        if (isNaN(min) || isNaN(max) || min >= max) {
          return {
            success: false,
            message: 'Invalid range. Usage: /roll [min] [max]',
            isSystemMessage: true,
          };
        }
      }

      const result = Math.floor(Math.random() * (max - min + 1)) + min;

      return {
        success: true,
        message: `🎲 ${context.username} rolled ${result} (${min}-${max})`,
        isSystemMessage: false,
        action: { type: 'roll', min, max, result },
      };
    },
  },
  {
    name: 'help',
    aliases: ['commands', '?'],
    description: 'Show available commands',
    usage: '/help',
    requiresPermission: false,
    handler: (_args, context) => {
      const availableCommands = COMMANDS.filter(
        cmd => !cmd.requiresPermission || context.isHost || context.isAdmin
      );

      const commandList = availableCommands
        .map(cmd => `/${cmd.name} - ${cmd.description}`)
        .join('\n');

      return {
        success: true,
        message: `Available commands:\n${commandList}`,
        isSystemMessage: true,
        action: { type: 'help', commands: availableCommands },
      };
    },
  },
  {
    name: 'clear',
    aliases: ['cls'],
    description: 'Clear your chat history',
    usage: '/clear',
    requiresPermission: false,
    handler: (_args, _context) => ({
      success: true,
      message: 'Chat cleared',
      isSystemMessage: true,
      action: { type: 'clear' },
    }),
  },
];

/**
 * Parse a chat message for commands
 */
export function parseCommand(
  message: string
): { isCommand: boolean; command?: string; args?: string[] } {
  if (!message.startsWith('/')) {
    return { isCommand: false };
  }

  const parts = message.slice(1).split(' ');
  const firstPart = parts[0];
  if (!firstPart) {
    return { isCommand: false };
  }
  const command = firstPart.toLowerCase();
  const args = parts.slice(1);

  return { isCommand: true, command, args };
}

/**
 * Execute a chat command
 */
export function executeCommand(
  message: string,
  context: CommandContext
): CommandResult | null {
  const parsed = parseCommand(message);

  if (!parsed.isCommand || !parsed.command) {
    return null;
  }

  // Find command by name or alias
  const command = COMMANDS.find(
    cmd =>
      cmd.name === parsed.command ||
      cmd.aliases.includes(parsed.command!)
  );

  if (!command) {
    return {
      success: false,
      message: `Unknown command: /${parsed.command}. Type /help for available commands.`,
      isSystemMessage: true,
    };
  }

  // Check permissions
  if (command.requiresPermission && !context.isHost && !context.isAdmin) {
    return {
      success: false,
      message: 'You do not have permission to use this command.',
      isSystemMessage: true,
    };
  }

  // Execute command
  return command.handler(parsed.args || [], context);
}

/**
 * Get all available commands for a user
 */
export function getAvailableCommands(context: Pick<CommandContext, 'isHost' | 'isAdmin'>): ChatCommand[] {
  return COMMANDS.filter(
    cmd => !cmd.requiresPermission || context.isHost || context.isAdmin
  );
}

/**
 * Check if message is a command
 */
export function isCommand(message: string): boolean {
  return message.startsWith('/');
}
