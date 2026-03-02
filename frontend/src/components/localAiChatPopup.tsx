import { useState } from 'react';
import { POST as getAiChatResponse } from '../utils/aiChatResponse';

interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

interface LocalPlace {
	name: string;
	address?: string;
	latitude: number;
	longitude: number;
}

interface LocalAiChatPopupProps {
	userName?: string;
	favoriteLocations: LocalPlace[];
	visitedLocations: LocalPlace[];
}

const LocalAiChatPopup = ({
	userName,
	favoriteLocations,
	visitedLocations,
}: LocalAiChatPopupProps) => {
	const [chatOpen, setChatOpen] = useState(true);
	const [chatInput, setChatInput] = useState('');
	const [chatLoading, setChatLoading] = useState(false);
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
		{
			role: 'assistant',
			content:
				'Ask me about local businesses, local trips, and places nearby.\n\n• Example: Best coffee shops near my saved places?\n• Example: Build a 1-day local food trip.',
		},
	]);

	const buildLocalContext = () => {
		const favoriteSummary = favoriteLocations
			.slice(0, 12)
			.map((loc) => `${loc.name} (${loc.address || 'No address'}) [${loc.latitude}, ${loc.longitude}]`)
			.join('; ');
		const visitedSummary = visitedLocations
			.slice(0, 12)
			.map((loc) => `${loc.name} (${loc.address || 'No address'}) [${loc.latitude}, ${loc.longitude}]`)
			.join('; ');

		return `User: ${userName || 'Unknown'}.
Favorite locations: ${favoriteSummary || 'None'}.
Visited locations: ${visitedSummary || 'None'}.
Respond with local-only suggestions tied to these places when possible.`;
	};

	const handleSendChat = async () => {
		const message = chatInput.trim();
		if (!message || chatLoading) return;
		if (!import.meta.env.PUBLIC_AI_API_KEY) {
			setChatMessages((prev) => [
				...prev,
				{ role: 'assistant', content: 'AI key is missing. Add PUBLIC_AI_API_KEY in frontend/.env and restart the dev server.' },
			]);
			return;
		}

		const nextMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: message }];
		setChatMessages(nextMessages);
		setChatInput('');
		setChatLoading(true);

		try {
			const aiMessages = [
				{ role: 'user', content: `Context:\n${buildLocalContext()}` },
				...nextMessages.map((m) => ({
					role: m.role,
					content: m.content,
				}))
			];

			const request = new Request('http://localhost/ai-chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: aiMessages }),
			});

			const response = await getAiChatResponse(request);
			const data = await response.json();
			if (!response.ok) {
				const status = response.status;
				const detail = data?.error?.message || data?.error || data?.message || '';
				if (status === 401) {
					throw new Error('Authentication failed. Check PUBLIC_AI_API_KEY in frontend/.env and restart dev server.');
				}
				throw new Error(detail || `AI request failed with status ${status}`);
			}
			const assistantTextRaw = data?.choices?.[0]?.message?.content;
			const assistantText = typeof assistantTextRaw === 'string' && assistantTextRaw.trim()
				? assistantTextRaw.replace(/^- /gm, '• ')
				: 'I could not respond right now. Please try again.';
			setChatMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
		} catch (error) {
			console.error('Chat error', error);
			setChatMessages((prev) => [
				...prev,
				{ role: 'assistant', content: error instanceof Error ? error.message : 'I could not respond right now. Please try again.' },
			]);
		} finally {
			setChatLoading(false);
		}
	};

	return (
		<div className="fixed bottom-5 right-5 z-[2000] w-[360px]">
			<div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-neutral-900/90 shadow-2xl backdrop-blur-xl">
				<div className="flex items-center justify-between border-b border-neutral-700 px-4 py-2.5">
						<p className="text-sm font-semibold tracking-wide text-cyan-300">Local AI Assistant</p>
						<button
							className="rounded-md px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
							onClick={() => setChatOpen((prev) => !prev)}
						>
							{chatOpen ? 'Minimize' : 'Maximize'}
						</button>
				</div>

				{chatOpen && (
					<div className="flex h-[440px] flex-col">
						<div className="flex-1 space-y-2.5 overflow-y-auto bg-gradient-to-b from-neutral-900/30 to-transparent p-3.5">
							{chatMessages.map((msg, idx) => (
								<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
									<div
										className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
											msg.role === 'user'
												? 'bg-cyan-500 font-medium text-black'
												: 'border border-neutral-700 bg-neutral-800 text-neutral-100'
										}`}
									>
										{msg.content}
									</div>
								</div>
							))}
							{chatLoading && (
								<div className="flex justify-start">
									<div className="max-w-[85%] rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300">
										Thinking...
									</div>
								</div>
							)}
						</div>

						<div className="flex items-end gap-2 border-t border-neutral-700 p-2.5">
							<textarea
								value={chatInput}
								onChange={(e) => setChatInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleSendChat();
									}
								}}
								placeholder="Ask about local places..."
								className="h-16 flex-1 resize-none rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-sm text-white outline-none focus:border-cyan-500"
							/>
							<button
								onClick={handleSendChat}
								disabled={chatLoading || !chatInput.trim()}
								className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Send
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default LocalAiChatPopup;
