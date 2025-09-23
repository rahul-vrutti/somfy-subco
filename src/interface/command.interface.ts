export interface CommandParserOutput {
    command_name: string;
    source_add: string;
    destination_add: string;
    source_node_type: number;
    dest_node_type: number;
    data: any;
}

export interface Command {
    command_name: string;
    sub_node_type?: number;
    dest_node_type: number;
    source_add?: string;
    destination_add: string;
    is_ack: boolean;
    ack_timeout: number;
    data: any;
    max_retry_count: number;
    priority?: Priority
    event_timeout: number;
}

export type Priority = 'high' | 'low' | undefined;

export interface MasterCommand {
    cmd_id: number;
    name: string;
}

export interface CommandBuilderInput {
    command_name: string;
    is_ack: boolean;
    dest_node_type: number;
    sub_node_type?: number;
    source_add?: string;
    destination_add: string;
    data: any;
}

export type stateType = "ready" | "wait_for_ack" | "reply_processing" | "completed" | "error" | "timeout";

