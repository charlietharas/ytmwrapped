import { useState, useEffect, useCallback } from 'react';
import { loadPyodide } from 'pyodide';

function usePyodide() {
    const [pyodide, setPyodide] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initPyodide = async () => {
            try {
                setIsLoading(true);
                const pyodideInstance = await loadPyodide({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/',
                });

                // Load micropip
                await pyodideInstance.loadPackage('micropip');
                const micropip = pyodideInstance.pyimport('micropip');
                await micropip.install('pandas');

                // Load our Python script
                const response = await fetch(
                    import.meta.env.BASE_URL + 'ytmwrapped.py'
                );
                const pythonCode = await response.text();
                pyodideInstance.runPython(pythonCode);

                setPyodide(pyodideInstance);
                setError(null);
            } catch (err) {
                console.error('Failed to initialize Pyodide:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        initPyodide();
    }, []);

    const runPythonFunction = useCallback(
        (functionName, ...args) => {
            if (!pyodide) {
                throw new Error('Pyodide is not initialized');
            }
            const func = pyodide.globals.get(functionName);
            if (!func) {
                console.error(
                    `Function ${functionName} not found in Python globals`
                );
                console.error(
                    'Available functions:',
                    Array.from(pyodide.globals.keys())
                );
                throw new Error(
                    `Python function '${functionName}' is not available`
                );
            }
            const resultProxy = func(...args);
            const result = resultProxy.toJs({
                dict_converter: Object.fromEntries,
            });
            resultProxy.destroy();
            return result;
        },
        [pyodide]
    );

    return {
        pyodide,
        isLoading,
        error,
        runPythonFunction,
    };
}

export default usePyodide;
