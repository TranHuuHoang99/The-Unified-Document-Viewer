import React from "react";

interface IButtonProps {
    buttonName?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
};

export const CompButton: React.FC<IButtonProps> = ({buttonName, style, onClick}) => {
    return (
        <button
            onClick={onClick}
            style={
                {
                    ...style
                }
            }
        >
            {buttonName}
        </button>
    );
};
