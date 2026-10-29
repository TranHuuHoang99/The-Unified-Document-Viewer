import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom'
import { CompInputField } from "../../../components/InputField";
import { CompButton } from "../../../components/Button";

export const SearchBar = () => {
    const inputStyle: React.CSSProperties = {
        height: '40px',
        width: '60%',
        boxSizing: 'border-box',
    };
    const buttonStyle: React.CSSProperties = {
        height: '40px',
        width: '10%',
        boxSizing: 'border-box',
        padding: '0 16px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
    const [keyword, setKeyword] = useState("");
    const navigate = useNavigate();
    const handleOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            navigate(`/document-viewer?vin=${encodeURIComponent(keyword)}`);
        }
    }
    const handleOnClick = () => {        
       navigate(`/document-viewer?vin=${encodeURIComponent(keyword)}`);
    }
    useEffect(() => {
        if (keyword.trim() === "") {
            navigate("/document-viewer"); 
        }
    }, [keyword, navigate]);
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center', 
                width: '100%',
                gap: '8px',
                margin: '16px 0',
            }}
        >
            <div style={inputStyle}>
                <CompInputField
                    holderPlace="Input your VIN ... "
                    value={keyword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
                    onKeyDown={handleOnKeyDown}
                />
            </div>
            <div style={buttonStyle}>
                <CompButton
                    buttonName="search"
                    onClick={handleOnClick}
                />
            </div>
        </div>
    );
};
