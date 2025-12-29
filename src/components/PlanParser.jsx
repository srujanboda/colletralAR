import React, { useRef, useState, useEffect } from 'react';

const PlanParser = () => {
    const canvasRef = useRef(null);
    const [image, setImage] = useState(null);
    const [savedRooms, setSavedRooms] = useState([]);
    const [currentPoints, setCurrentPoints] = useState([]);
    const [status, setStatus] = useState("Step 1: Upload a floor plan image");

    useEffect(() => {
        draw();
    }, [image, savedRooms, currentPoints]);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (f) => {
                const img = new Image();
                img.onload = () => {
                    setImage(img);
                    setStatus("Step 2: Click the corners of a room to highlight it");
                };
                img.src = f.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCanvasClick = (e) => {
        if (!image) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        // Scale logic if canvas display size differs from actual size
        // For simplicity, we assume canvas.width = img.width (set in draw)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setCurrentPoints(prev => [...prev, { x, y }]);
    };

    const finishRoom = () => {
        if (currentPoints.length > 2) {
            setSavedRooms(prev => [...prev, {
                points: [...currentPoints],
                color: "rgba(40, 167, 69, 0.4)"
            }]);
            setCurrentPoints([]);
            setStatus("Room Saved! Start clicking the next room.");
        } else {
            alert("Please click at least 3 points to define a room area.");
        }
    };

    const clearAll = () => {
        setSavedRooms([]);
        setCurrentPoints([]);
        setStatus("Cleared. Start clicking to define a room.");
    };

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (image) {
            // Resize canvas to match image logic
            if (canvas.width !== image.width || canvas.height !== image.height) {
                canvas.width = image.width;
                canvas.height = image.height;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0);
        } else {
            // Default size if no image
            canvas.width = 800;
            canvas.height = 600;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText("Upload Floor Plan", 400, 300);
            return;
        }

        // 1. Draw Saved
        savedRooms.forEach(room => drawShape(ctx, room.points, room.color, "#28a745"));

        // 2. Draw Current
        if (currentPoints.length > 0) {
            drawShape(ctx, currentPoints, "rgba(0, 123, 255, 0.5)", "#007bff");
            currentPoints.forEach(p => {
                ctx.fillStyle = "#007bff";
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    };

    const drawShape = (ctx, points, fillColor, strokeColor) => {
        if (points.length < 1) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        if (points.length > 2) {
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="toolbar" style={{ background: 'white', padding: 20, borderRadius: 8, marginBottom: 20, color: 'black' }}>
                <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: 10 }}>{status}</div>
                <input type="file" accept="image/*" onChange={handleUpload} style={{ marginBottom: 10 }} />
                <br />
                <button onClick={finishRoom} style={{ backgroundColor: '#007bff', marginRight: 10 }}>Save Room</button>
                <button onClick={clearAll} style={{ backgroundColor: '#dc3545' }}>Clear All</button>
            </div>
            <div style={{ border: '2px solid #333', borderRadius: 4, overflow: 'hidden' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasClick}
                    style={{
                        display: 'block',
                        maxWidth: '100%',
                        height: 'auto',
                        cursor: 'crosshair'
                    }}
                />
            </div>
        </div>
    );
};

export default PlanParser;
