
import React from 'react';
import { AlertTriangleIcon } from './icons';

interface ErrorDisplayProps {
    message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
    return (
        <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
            <div className="flex items-center">
                <AlertTriangleIcon className="w-6 h-6 mr-3 text-red-400" />
                <div>
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{message}</span>
                </div>
            </div>
        </div>
    );
};
