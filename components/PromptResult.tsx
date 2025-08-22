import React from 'react';
import type { GeneratedPrompts } from '../types';
import { CopyIcon, CheckIcon } from './icons';

interface PromptResultProps {
  prompts: GeneratedPrompts;
}

export const PromptResult: React.FC<PromptResultProps> = ({ prompts }) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(prompts).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="bg-brand-bg-light p-6 rounded-lg border border-brand-border shadow-lg flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-brand-text">Generated Script</h2>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-bg-dark text-brand-text-secondary hover:bg-brand-border rounded-md transition"
                >
                    {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy Script'}
                </button>
            </div>
            <div className="bg-brand-bg-dark p-4 rounded-md border border-brand-border text-brand-text-secondary whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
                {prompts}
            </div>
        </div>
    );
};
