import React from "react";

interface IInputFieldProps {
    holderPlace?: string;
    style?: React.CSSProperties;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export const CompInputField: React.FC<IInputFieldProps> = ({
    holderPlace,
    style,
    value,
    onChange,
    onKeyDown,
}) => {
    return (
        <input
            placeholder={holderPlace || "input your keyword ... "}
            style={{
                width: '100%',
                padding: "8px 12px",
                marginBottom: "20px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                ...style,
            }}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
        >
        </input>
    );
};
