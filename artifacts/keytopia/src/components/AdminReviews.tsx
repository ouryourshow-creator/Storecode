import { useCallback, useEffect, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "../contexts/LanguageContext";

interface Review {
  id: number;
  reviewerName: string;
  reviewDate: string;
  content: string;
}

export default function AdminReviews() {
  const { dir } = useLang();
  const isRtl = dir === "rtl";
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    reviewerName: "",
    reviewDate: new Date().toISOString().slice(0, 10),
    content: "",
  });

  const loadReviews = useCallback(async () => {
    try {
      const response = await fetch("/api/reviews");
      if (!response.ok) throw new Error("Unable to load reviews");
      setReviews(await response.json());
    } catch {
      toast.error(isRtl ? "تعذر تحميل التقييمات" : "Could not load reviews");
    } finally {
      setLoading(false);
    }
  }, [isRtl]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(result?.error ?? "Could not add review");
      setReviews((current) => [result, ...current]);
      setForm({
        reviewerName: "",
        reviewDate: new Date().toISOString().slice(0, 10),
        content: "",
      });
      toast.success(isRtl ? "تمت إضافة التقييم" : "Review added");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isRtl
            ? "فشلت إضافة التقييم"
            : "Could not add review",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(isRtl ? "هل تريد حذف هذا التقييم؟" : "Delete this review?"))
      return;
    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      toast.error(isRtl ? "تعذر حذف التقييم" : "Could not delete review");
      return;
    }
    setReviews((current) => current.filter((review) => review.id !== id));
    toast.success(isRtl ? "تم حذف التقييم" : "Review deleted");
  };

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-muted px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary";
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">
          {isRtl ? "التقييمات" : "Reviews"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isRtl
            ? "أضف تقييمات العملاء التي تظهر في الصفحة الرئيسية."
            : "Add customer reviews displayed on the home page."}
        </p>
      </div>
      <form
        onSubmit={submit}
        className="mb-8 grid gap-4 rounded-[24px] border border-black/[0.03] bg-white p-6 shadow-sm md:grid-cols-2"
      >
        <label className="text-sm font-semibold">
          {isRtl ? "الاسم الأول والثاني" : "First and second name"}
          <input
            required
            maxLength={100}
            pattern="\S+\s+\S+"
            value={form.reviewerName}
            onChange={(e) => setForm({ ...form, reviewerName: e.target.value })}
            className={`${inputClass} mt-2`}
          />
        </label>
        <label className="text-sm font-semibold">
          {isRtl ? "تاريخ التقييم" : "Review date"}
          <input
            required
            type="date"
            value={form.reviewDate}
            onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
            className={`${inputClass} mt-2`}
          />
        </label>
        <label className="text-sm font-semibold md:col-span-2">
          {isRtl ? "محتوى التقييم" : "Review content"}
          <textarea
            required
            maxLength={2000}
            rows={4}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            className={`${inputClass} mt-2 resize-y`}
          />
        </label>
        <button
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60 md:col-span-2 md:justify-self-start"
        >
          <Plus className="h-4 w-4" />
          {submitting ? "..." : isRtl ? "إضافة التقييم" : "Add review"}
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <p>{isRtl ? "جار التحميل..." : "Loading..."}</p>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[20px] border border-black/[0.04] bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{review.reviewerName}</p>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={review.reviewDate}
                  >
                    {review.reviewDate}
                  </time>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(review.id)}
                  aria-label={isRtl ? "حذف التقييم" : "Delete review"}
                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-2 flex gap-0.5">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed">
                {review.content}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
