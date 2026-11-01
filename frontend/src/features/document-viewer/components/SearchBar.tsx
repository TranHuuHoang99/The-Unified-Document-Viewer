import React, { ForwardedRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CompButton } from '../../../components/Button';
import { CompInputField } from '../../../components/InputField';
import { isValidVin } from '../../../types/document.types';
import { SUGGESTION_TIMEOUT } from '../../../constants/config';
import { fetchSuggestionsByVinSubstr } from '../../../services/api';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

interface ISearchSuggestion {
    updateQuery: (vinSubstr: string) => void;
};

const SearchSuggestionComp = React.forwardRef<ISearchSuggestion, {}>((_, ref) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setLoadingState] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const controllerRef = useRef<AbortController | null>(null);
    const navigate = useNavigate();

    useImperativeHandle(ref, () => ({
        updateQuery(vinSubstr: string) {
            setQuery(vinSubstr);
        },
    }));

    // on change whenever user type
    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            return;
        }

        // if query change => abort current URL request to backend
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        setLoadingState(true);

        const onChangeRebounce = setTimeout( async () => {
            const responseData = await fetchSuggestionsByVinSubstr(query, controller.signal);
            const vinStrings = responseData as string[];
            console.log(`suggestions response data : `, responseData);
            setSuggestions(vinStrings);
            setLoadingState(false);
        }, SUGGESTION_TIMEOUT);

        return () => clearTimeout(onChangeRebounce);
    }, [query]);

    if (suggestions.length === 0) return null;

    if (isLoading) {
        return (
            <div style={{
                position: 'absolute',
                zIndex: 9999,
            }}>
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <ul className="suggestions-dropdown"
            style={{
                position: 'absolute',
                zIndex: 9999,
                left: 'auto',
                right: 'auto',
                width: '430px',
                backgroundColor: '#ffffff',
                border: '1px solid #dfe1e5',
                borderRadius: '8px',
                padding: '8px 0',
                margin: '4px 0 0 0',
                listStyle: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxHeight: '250px',
                overflowY: 'auto'
            }}
        >
            {suggestions.map((vin: string, index: number) => (
                <li
                    key={index}
                    onClick={() => {
                        navigate(`/document-viewer?vin=${encodeURIComponent(vin)}`);
                        setSuggestions([]);
                    }}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                        padding: '10px 16px',
                        fontSize: '14px',
                        color: '#202124',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: hoveredIndex === index ? '#f1f3f4' : 'transparent',
                        transition: 'background-color 0.1s ease'
                    }}
                >
                    {vin}
                </li>
            ))}
        </ul>
    );
});

/*
    Single VIN input; submit on Enter or button click.
    The VIN lives in the URL so results are shareable.
*/
export const SearchBar = () => {
    const [searchParams] = useSearchParams();
    const [keyword, setKeyword] = useState(searchParams.get('vin') ?? '');
    // const [touched, setTouched] = useState(false);
    const navigate = useNavigate();

    const vin = keyword.trim().toUpperCase();
    // const showValidationError = touched && keyword.trim() !== '' && !isValidVin(vin);

    const submit = () => {
        // setTouched(true);
        if (isValidVin(vin)) {
            navigate(`/document-viewer?vin=${encodeURIComponent(vin)}`);
        }
    };

    const handleOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            submit();
        }
    };

    const searchSuggestionRef = useRef<ISearchSuggestion>(null);
    const handleOnKeyChange = (vinSubstr: string) => {
        searchSuggestionRef?.current?.updateQuery(vinSubstr);
    };

    useEffect(() => {
        const vinFromUrl = searchParams.get('vin') ?? '';
        setKeyword(vinFromUrl);
    }, [searchParams]);

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
                    onChange={(e) => {
                        const upperCaseStr = e.target.value.toUpperCase();
                        setKeyword(upperCaseStr);
                        handleOnKeyChange(upperCaseStr);
                    }}
                    onKeyDown={handleOnKeyDown}
                />
                {/* {showValidationError && (
                    <div style={{ color: '#b91c1c' }}>
                        A VIN must be exactly 17 alphanumeric characters (I, O and Q are not allowed).
                    </div>
                )} */}
                <SearchSuggestionComp ref={searchSuggestionRef}/>
            </div>
            {/* <CompButton buttonName="Search" onClick={submit} /> */}
        </div>
    );
};
