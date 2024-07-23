import { getInput, setFailed, setOutput } from '@actions/core';
import { WebClient } from '@slack/web-api';
import { buildSlackAttachments, formatChannelName } from './src/utils';

export const handler = async () => {
  try {
    const channel = getInput('channel');
    const status = getInput('status');
    const color = getInput('color');
    const messageId = getInput('message_id');
    const author = getInput('author');
    const commit_message = getInput('commit_message');
    const token = process.env.SLACK_BOT_TOKEN;
    const slack = new WebClient(token);

    if (!channel && !getInput('channel_id')) {
      setFailed(`You must provider either a 'channel' or a 'channel_id'.`);
      return;
    }

    const attachments = buildSlackAttachments({ status, color, author, commit_message });
    const channelId = getInput('channel_id') || (await lookUpChannelId({ slack, channel }));

    if (!channelId) {
      setFailed(`Slack channel ${channel} could not be found.`);
      return;
    }

    const apiMethod = Boolean(messageId) ? 'update' : 'postMessage';

    const args = {
      channel: channelId,
      attachments,
    };

    if (messageId) {
      args.ts = messageId;
    }

    const response = await slack.chat[apiMethod](args);

    setOutput('message_id', response.ts);
  } catch (error) {
    setFailed(error);
  }
};

async function lookUpChannelId({ slack, channel }) {
  let result;
  const formattedChannel = formatChannelName(channel);

  // Async iteration is similar to a simple for loop.
  // Use only the first two parameters to get an async iterator.
  for await (const page of slack.paginate('conversations.list', { types: 'public_channel, private_channel' })) {
    // You can inspect each page, find your result, and stop the loop with a `break` statement
    const match = page.channels.find(c => c.name === formattedChannel);
    if (match) {
      result = match.id;
      break;
    }
  }

  return result;
}
