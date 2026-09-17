import { useState } from 'react';
import { Button } from './ui/button';
import { AlertCircle, X } from 'lucide-react';

export function BiasGuidelineModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 flex items-center gap-2"
      >
        <AlertCircle className="w-4 h-4" />
        Pedoman Bias Penilaian
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Pedoman Menghindari Bias Penilaian</h3>
                  <p className="text-sm text-slate-500">Panduan untuk menjaga objektivitas dan keadilan.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full hover:bg-slate-100 shrink-0">
                <X className="w-5 h-5 text-slate-500" />
              </Button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800 leading-relaxed text-left sm:text-justify">
                Penilaian subjektif rentan terhadap berbagai bias kognitif yang bisa memengaruhi keadilan dan akurasi hasil. Berikut adalah bias-bias yang umum terjadi yang harus dihindari oleh setiap juri:
              </div>

              <div className="space-y-5">
                {[
                  {
                    title: "1. Bias Personal",
                    desc: "Penilai memberi skor berdasarkan perasaan, preferensi pribadi, atau hubungan dengan peserta.",
                    example: "Memberi nilai lebih tinggi karena peserta berasal dari sekolah yang sama dengan juri."
                  },
                  {
                    title: "2. Efek Halo (Halo Effect)",
                    desc: "Penilaian positif pada satu aspek memengaruhi penilaian positif pada seluruh aspek lainnya, bahkan yang tidak berhubungan.",
                    example: "Penampilan yel-yel yang energik membuat juri memberi nilai tinggi pada kerapian barisan, padahal kurang rapi."
                  },
                  {
                    title: "3. Efek Horn (Horn Effect)",
                    desc: "Kebalikan dari Efek Halo. Penilaian negatif pada satu aspek memengaruhi penilaian negatif pada seluruh aspek lainnya.",
                    example: "Peserta terlihat kotor di awal, sehingga juri cenderung memberikan nilai rendah pada semua aspek."
                  },
                  {
                    title: "4. Efek Kontras (Contrast Effect)",
                    desc: "Penilaian dipengaruhi oleh perbandingan dengan penampilan peserta sebelumnya.",
                    example: "Tim yang tampil biasa saja akan terlihat buruk jika dinilai setelah tim yang tampil sangat luar biasa."
                  },
                  {
                    title: "5. Bias Jangkar (Anchoring Bias)",
                    desc: "Penilai terlalu berpegang pada informasi atau kesan pertama sebagai patokan untuk semua penilaian berikutnya.",
                    example: "Semua tim tidak bisa mendapat nilai sempurna karena dibandingkan dengan standar awal tim pertama yang sangat tinggi."
                  },
                  {
                    title: "6. Efek Primacy dan Recency",
                    desc: "Penilaian lebih kuat dipengaruhi oleh tim yang tampil pertama (Primacy) atau tim yang tampil terakhir (Recency).",
                    example: "Tim di urutan tengah cenderung kurang mendapat perhatian dibandingkan tim yang mengawali atau mengakhiri lomba."
                  },
                  {
                    title: "7. Kelelahan Pengambil Keputusan (Decision Fatigue)",
                    desc: "Penilai menjadi lelah karena harus membuat keputusan terus-menerus, sehingga kualitas ketelitian menurun.",
                    example: "Juri memberikan skor lebih cepat dan kurang teliti pada tim-tim yang tampil di akhir lomba."
                  }
                ].map((bias, idx) => (
                  <div key={idx} className="border-l-4 border-amber-400 pl-4 py-1">
                    <h4 className="font-bold text-slate-800 text-base">{bias.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed text-left sm:text-justify">{bias.desc}</p>
                    <div className="mt-3 bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-sm">
                      <div className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                        Contoh:
                      </div> 
                      <div className="text-slate-600 italic leading-relaxed text-left sm:text-justify pl-2.5 border-l-2 border-slate-200">
                        {bias.example}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-xl">
              <Button onClick={() => setIsOpen(false)} className="bg-slate-900 text-white hover:bg-slate-800 w-full sm:w-auto">
                Saya Mengerti
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
