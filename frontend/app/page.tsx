'use client'
import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
    type: 'user' | 'ai';
    originalText: string;
    displayText: string;
    isThinkingVisible?: boolean;
}

export default function Home() {
    const [question, setQuestion] = useState<string>("");
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isThinking, setIsThinking] = useState<boolean>(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);

    const thinkTagRegex = /<think>([\s\S]*?)<\/think>([\s\S]*)/;

    const parseAiMessage = (fullText: string) => {
        if (typeof fullText !== 'string') {
            console.warn("parseAiMessage received non-string input:", fullText);
            return { thinking: '', actual: String(fullText).trim() };
        }

        const match = fullText.match(thinkTagRegex);
        if (match) {
            const thinkingContent = match[1].trim();
            const actualContent = match[2].trim();
            return { thinking: thinkingContent, actual: actualContent };
        }
        return { thinking: '', actual: fullText.trim() };
    };

    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                const savedChat = localStorage.getItem('chatHistory');
                if (savedChat) {
                    const parsedSavedChat = JSON.parse(savedChat);
                    
                    const loadedHistory: ChatMessage[] = parsedSavedChat.map((msg: any) => {
                        const messageType = msg.type === 'user' || msg.type === 'ai' ? msg.type : 'ai';
                        let originalText = msg.text || ''; 
                        let displayText = originalText;
                        let isThinkingVisible = false;

                        if (messageType === 'ai') {
                            const parsedContent = parseAiMessage(originalText);
                            displayText = parsedContent.actual;
                        } else { 
                            originalText = msg.text || '';
                            displayText = originalText;
                        }

                        return {
                            type: messageType,
                            originalText: originalText,
                            displayText: displayText,
                            isThinkingVisible: isThinkingVisible
                        };
                    });
                    setChatHistory(loadedHistory);
                }
            }
        } catch (error) {
            console.error("Failed to load chat history from localStorage:", error);
            setChatHistory([]); 
            localStorage.removeItem('chatHistory');
        }
    }, []);

    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                const historyToSave = chatHistory.map(msg => ({
                    type: msg.type,
                    text: msg.type === 'ai' ? msg.originalText : msg.displayText 
                }));
                localStorage.setItem('chatHistory', JSON.stringify(historyToSave));
            }
        } catch (error) {
            console.error("Failed to save chat history to localStorage:", error);
        }
    }, [chatHistory]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    async function askAI(prompt: string) {
        if (!prompt.trim()) return;

        const newUserMessage: ChatMessage = { type: 'user', originalText: prompt, displayText: prompt };
        setChatHistory(prevHistory => [...prevHistory, newUserMessage]);
        setQuestion("");

        setIsThinking(true);

        try {
            const res = await fetch('/api/ask', {
                method: 'POST',
                body: JSON.stringify({ prompt }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            const fullResponseWithThink = data.response || '';

            const { thinking, actual } = parseAiMessage(fullResponseWithThink);

            const newAiMessage: ChatMessage = {
                type: 'ai',
                originalText: fullResponseWithThink,
                displayText: actual,
                isThinkingVisible: false
            };
            setChatHistory(prevHistory => [...prevHistory, newAiMessage]);

        } catch (error) {
            console.error("Error during fetch:", error);
            const errorMessage: ChatMessage = {
                type: 'ai',
                originalText: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
                displayText: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
                isThinkingVisible: false
            };
            setChatHistory(prevHistory => [...prevHistory, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    }

    const clearChat = () => {
        setChatHistory([]);
        localStorage.removeItem('chatHistory');
    };

    const toggleThinkingVisibility = (index: number) => {
        setChatHistory(prevHistory =>
            prevHistory.map((msg, i) =>
                i === index && msg.type === 'ai'
                    ? { ...msg, isThinkingVisible: !msg.isThinkingVisible }
                    : msg
            )
        );
    };

    const isProcessing = isThinking;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-between px-4 py-8">
            <div className="bg-white shadow-2xl rounded-2xl p-8 **w-full max-w-[90%] h-full** max-h-[90vh] flex flex-col"> {/* <-- ปรับตรงนี้ */}
                <h1 className="text-2xl font-bold text-center text-gray-800">Ask AI Chat</h1>

                <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 p-2 border border-gray-200 rounded-xl bg-gray-50 **flex-grow**"> {/* <-- ปรับตรงนี้ */}
                    {chatHistory.length === 0 ? (
                        <p className="text-center text-gray-500 italic">Start a conversation!</p>
                    ) : (
                        chatHistory.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`p-3 rounded-lg max-w-[80%] ${
                                        msg.type === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-800'
                                    }`}
                                >
                                    {/* แสดงข้อความตาม type */}
                                    {msg.type === 'user' ? (
                                        <p>{msg.displayText}</p>
                                    ) : (
                                        <div>
                                            {/* ปุ่มสำหรับแสดง/ซ่อน Thinking */}
                                            {parseAiMessage(msg.originalText).thinking.length > 0 && (
                                                <button
                                                    onClick={() => toggleThinkingVisibility(index)}
                                                    className="text-blue-500 hover:underline text-sm mb-2"
                                                >
                                                    {msg.isThinkingVisible ? 'Hide Thinking' : 'Show Thinking'}
                                                </button>
                                            )}
                                            {/* ส่วนที่แสดง Thinking Content */}
                                            {msg.isThinkingVisible && parseAiMessage(msg.originalText).thinking.length > 0 && (
                                                <div className="bg-gray-100 p-2 rounded-md mb-2 text-gray-600 italic text-sm">
                                                    <p>{parseAiMessage(msg.originalText).thinking}</p>
                                                </div>
                                            )}
                                            {/* ข้อความ AI หลัก - แสดงผลด้วย ReactMarkdown */}
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.displayText}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="p-3 rounded-lg bg-gray-200 text-gray-800">
                                <span className="loading loading-spinner loading-xl"></span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col space-y-4 mt-6">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !isProcessing) {
                                askAI(question);
                            }
                        }}
                        placeholder="Type your question..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-black"
                        disabled={isProcessing}
                    />
                    <div className="flex space-x-2">
                        <button
                            onClick={() => askAI(question)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition shadow-md"
                            disabled={isProcessing}
                        >
                            {isThinking ? 'Thinking...' : 'Send'}
                        </button>
                        <button
                            onClick={clearChat}
                            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-xl transition shadow-md"
                            disabled={isProcessing}
                        >
                            Clear Chat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}