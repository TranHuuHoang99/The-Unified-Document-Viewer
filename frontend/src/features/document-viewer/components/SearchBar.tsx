import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CompButton } from '../../../components/Button';
import { CompInputField } from '../../../components/InputField';
import { isValidVin } from '../../../types/document.types';

/*
    Single VIN input; submit on Enter or button click.
    The VIN lives in the URL so results are shareable.
*/
export const SearchBar = () => {
    const [searchParams] = useSearchParams();
    const [keyword, setKeyword] = useState(searchParams.get('vin') ?? '');
    const [touched, setTouched] = useState(false);
    const navigate = useNavigate();

    const vin = keyword.trim().toUpperCase();
    const showValidationError = touched && keyword.trim() !== '' && !isValidVin(vin);

    const submit = () => {
        setTouched(true);
        if (isValidVin(vin)) {
            navigate(`/document-viewer?vin=${encodeURIComponent(vin)}`);
        }
    };

    const handleOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            submit();
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-start',
                width: '100%',
                gap: '8px',
                margin: '16px 0',
            }}
        >
            <div style={{ width: '320px', maxWidth: '60%', textAlign: 'left' }}>
                <CompInputField
                    holderPlace="Enter a 17-character VIN …"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value.toUpperCase())}
                    onKeyDown={handleOnKeyDown}
                />
                {showValidationError && (
                    <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '-14px', marginBottom: '8px' }}>
                        A VIN must be exactly 17 alphanumeric characters (I, O and Q are not allowed).
                    </div>
                )}
            </div>
<<<<<<< Updated upstream
            {/* <CompButton buttonName="Search" onClick={submit} /> */}
=======
            <CompButton buttonName="Search" onClick={submit} />
>>>>>>> Stashed changes
        </div>
    );
};
