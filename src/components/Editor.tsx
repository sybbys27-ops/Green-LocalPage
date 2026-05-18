import { useState, useRef, useMemo, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Save, X } from "lucide-react";
import { motion } from "motion/react";

export default function Editor({ postId, categoryId, onSaved, onCancel }: any) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pendingImages, setPendingImages] = useState<number[]>([]);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    if (postId) {
      fetch(`/api/posts/${postId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setTitle(d.data.title);
            setContent(d.data.content);
          }
        });
    }
  }, [postId]);

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          setPendingImages(prev => [...prev, data.image_id]);
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, "image", data.image_url);
        }
      } catch (err) {
        alert("Image upload failed");
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image", "video"],
        ["clean"],
      ],
      handlers: {
        image: imageHandler,
      },
    },
  }), []);

  const savePost = async () => {
    if (!title.trim()) return alert("Title required");
    
    const url = postId ? `/api/posts/${postId}` : "/api/posts";
    const method = postId ? "PUT" : "POST";
    
    // In case user deletes some images from editor, we might still associate them but cleanup task handles it.
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_id: categoryId, title, content, pending_images: pendingImages })
    });
    const data = await res.json();
    if (data.success) {
      onSaved(postId || data.id);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      className="p-8 max-w-4xl mx-auto h-full flex flex-col pt-12"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="serif-italic text-emerald-400 mb-1 block">Masterpiece in Progress</span>
          <input 
            className="text-4xl font-bold bg-transparent border-none outline-none text-white w-full placeholder:text-gray-600 focus:ring-0"
            placeholder="Untitled Post..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition px-4 py-2 flex items-center gap-2">
            <X size={18}/> Cancel
          </button>
          <button onClick={savePost} className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-sm font-bold transition flex items-center gap-2 text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Save size={16}/> Publish
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] pb-20">
        <ReactQuill 
          ref={quillRef}
          theme="snow" 
          value={content} 
          onChange={setContent} 
          modules={modules}
          className="h-full editor-content font-sans"
        />
      </div>
    </motion.div>
  );
}
