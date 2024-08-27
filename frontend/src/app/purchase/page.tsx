"use client";
import { useState, useEffect } from "react";
import { getEcSets } from "./getECSets";
import { getRecommendations } from "./getRecommend";
import { useRouter } from "next/navigation";
import { createPurchase } from "./createPurchase";
import Navbar from "../common/Navbar";
import ProfileContainer from "./ProfileContainer";
import PurchaseSetContainer from "./PurchaseSetContainer";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ECSetItem, RecommendResponseItem, nationalCraftOptions, PurchaseItem, PurchaseSetItem, NgList, DecodedToken } from "../../types/purchase_types";

export default function Home() {
  const [nationalEcSets, setNationalEcSets] = useState<ECSetItem[]>([]);
  const [craftEcSets, setCraftEcSets] = useState<ECSetItem[]>([]);
  const [nationalRecommendations, setNationalRecommendations] = useState<RecommendResponseItem[]>([]);
  const [craftRecommendations, setCraftRecommendations] = useState<RecommendResponseItem[]>([]);

  const [nationalSelectedSet, setNationalSelectedSet] = useState<ECSetItem>();
  const [craftSelectedSet, setCraftSelectedSet] = useState<ECSetItem>();

  const [isNationalSelected, setIsNationalSelected] = useState(false);
  const [isCraftSelected, setIsCraftSelected] = useState(false);
  const [totalCans, setTotalCans] = useState<number>(24);
  const [nationalCraftRatio, setNationalCraftRatio] = useState<{ national: number; craft: number }>(nationalCraftOptions[24][1]);

  const [nationalSet, setNationalSet] = useState<{ cans: number; set_name: string; set_id: number }>({
    cans: 0,
    set_name: "",
    set_id: 0,
  });
  const [craftSet, setCraftSet] = useState<{ cans: number; set_name: string; set_id: number }>({
    cans: 0,
    set_name: "",
    set_id: 0,
  });
  const [nationalSetDetails, setNationalSetDetails] = useState<PurchaseItem[]>([]);
  const [craftSetDetails, setCraftSetDetails] = useState<PurchaseItem[]>([]);

  const [nationalKinds, setNationalKinds] = useState<number>(2);
  const [craftKinds, setCraftKinds] = useState<number>(3);
  const nationalKindsOptions = [1, 2];
  const craftKindsOptions = [1, 2, 3, 6];

  const [ngList, setNgList] = useState<NgList[]>([]);

  const [purchaseSetItemAll, setPurchaseSetItemAll] = useState<PurchaseSetItem[]>([]);
  const [jwt, setJwt] = useState<string>("");
  const [userId, setUserId] = useState<number | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [selectedSetDetails, setSelectedSetDetails] = useState<RecommendResponseItem[]>([]);
  const [selectedSetDescription, setSelectedSetDescription] = useState("");
  const [selectedSetName, setSelectedSetName] = useState("");

  const router = useRouter();

  const fetchData = async (category: string) => {
    try {
      const data = await getEcSets(category);
      if (category === "national") {
        setNationalEcSets(data);
      } else if (category === "craft") {
        setCraftEcSets(data);
      }
    } catch (error) {
      console.error("Failed to fetch EC sets:", error);
    }
  };

  const fetchRecommendations = async (set_name: string, ec_set_id: number, category: string, cans: number, kinds: number, ngList: NgList[], jwt: string) => {
    try {
      const ngIdList: number[] = ngList?.map((item) => item.ng_id);
      const data = await getRecommendations(
        {
          ec_set_id,
          category,
          cans,
          kinds,
          ng_id: ngIdList,
        },
        jwt
      );

      const updatedData = data.map((item) => ({
        ...item,
        ec_set_id: ec_set_id,
        category: category,
      }));

      if (category === "national") {
        setNationalSet({ cans: cans, set_name: set_name, set_id: ec_set_id });
        setNationalRecommendations(updatedData);
        setNationalSetDetails(updatedData);
        setSelectedSetDetails(updatedData);
        setSelectedSetDescription(nationalEcSets.find((set) => set.ec_set_id === ec_set_id)?.set_description || "");
        setSelectedSetName(set_name);
        setIsNationalSelected(true);
      } else if (category === "craft") {
        setCraftSet({ cans: cans, set_name: set_name, set_id: ec_set_id });
        setCraftRecommendations(updatedData);
        setCraftSetDetails(updatedData);
        setSelectedSetDetails(updatedData);
        setSelectedSetDescription(craftEcSets.find((set) => set.ec_set_id === ec_set_id)?.set_description || "");
        setSelectedSetName(set_name);
        setIsCraftSelected(true);
      }
      setIsModalOpen(true); // ポップアップ表示
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleOpenCartModal = () => {
    setIsCartModalOpen(true); // まずモーダルを表示する
  };

  const handleCloseCartModal = () => {
    setIsCartModalOpen(false);
  };

  useEffect(() => {
    fetchData("national");
    fetchData("craft");
    const token = localStorage.getItem("token") as string;
    if (token) {
      setJwt(token);
      const decodedToken = jwtDecode<DecodedToken>(token);
      setUserId(Number(decodedToken.sub));
    }
  }, []);

  useEffect(() => {
    setNationalCraftRatio(nationalCraftOptions[totalCans][1]);
  }, [totalCans]);

  const handleRemoveNgItem = (indexToRemove: number) => {
    setNgList((prevNgList) => prevNgList.filter((_, index) => index !== indexToRemove));
  };

  const handleAddToCart = () => {
    const combinedCans = nationalSet.cans + craftSet.cans;

    if (combinedCans === totalCans) {
      const newPurchaseSetItem: PurchaseSetItem = {
        setDetails: {
          cans: combinedCans,
          set_num: 1,
        },
        national_set: {
          cans: nationalSet.cans,
          set_name: nationalSet.set_name,
          details: nationalSetDetails,
        },
        craft_set: {
          cans: craftSet.cans,
          set_name: craftSet.set_name,
          details: craftSetDetails,
        },
      };
      setPurchaseSetItemAll((prevItems) => [...prevItems, newPurchaseSetItem]);
      handleOpenCartModal();

      console.log("Updated purchaseSetItemAll: ", purchaseSetItemAll);
    } else {
      if ((isNationalSelected || nationalCraftRatio.national === 0) && !isCraftSelected) {
        alert("クラフトブランドを選択してください");
      } else if (!isNationalSelected && (isCraftSelected || nationalCraftRatio.craft === 0)) {
        alert("ナショナルブランドを選択してください");
      } else if (!isNationalSelected && !isCraftSelected) {
        alert("クラフトブランドとナショナルブランドを選択してください");
      }
    }
  };

  const handlePurchaseItemAll = async () => {
    try {
      console.log("Purchase Set Items: ", purchaseSetItemAll);
      const data = await createPurchase(purchaseSetItemAll, jwt);
      toast.success("購入ありがとうございます！"); // 成功トーストメッセージを表示
      // `alert`は削除、トーストのみで通知
      setTimeout(() => {
        // router.push("/user");
        window.location.href = "/purchase";
      }, 1500); // トーストが表示されるのを少し待ってからリダイレクト
    } catch (error) {
      console.error("Error creating purchase:", error);
      toast.error("購入に失敗しました。もう一度お試しください。"); // エラートーストメッセージを表示
    }
  };

  const ResetNationalSetSelection = () => {
    setNationalSet({ cans: 0, set_name: "", set_id: 0 });
    setNationalSelectedSet(undefined);
    setNationalSetDetails([]);
    setIsNationalSelected(false);
  };

  const ResetCraftSetSelection = () => {
    setCraftSet({ cans: 0, set_name: "", set_id: 0 });
    setCraftSelectedSet(undefined);
    setCraftSetDetails([]);
    setIsCraftSelected(false);
  };

  const handleResetCart = () => {
    console.log("Reset button clicked");
    setPurchaseSetItemAll([]); // カートをリセット
    ResetNationalSetSelection(); // ナショナルセットをリセット
    ResetCraftSetSelection(); // クラフトセットをリセット
    handleCloseCartModal(); // ポップアップを閉じる
  };

  return (
    <div className="container mx-auto p-4 bg-gray-100 min-h-screen pt-10 mt-5">
      <Navbar />
      <div className="flex justify-between items-start bg-gray-100 rounded px-4 gap-4 mb-1 pt-10 pr-10 mt-5">
        <div className="card bg-white shadow-md rounded-lg pt-2 px-4 pb-1 w-1/5">
          <h1 className="text-xl font-bold mb-4 text-amber-600" style={{ fontFamily: "Poppins, sans-serif" }}>
            Step1 <span style={{ display: "block" }}>お届け数量を選択</span>
          </h1>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">全体の本数</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(nationalCraftOptions).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setTotalCans(Number(key));
                    ResetNationalSetSelection();
                    ResetCraftSetSelection();
                  }}
                  className={`py-2 px-4 rounded-lg text-white font-bold ${totalCans === Number(key) ? "bg-amber-600" : "bg-gray-300"} hover:bg-amber-500 transition-all duration-200`}
                >
                  {key}本
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">ナショナル：クラフト</label>
            <div className="grid grid-cols-2 gap-2">
              {nationalCraftOptions[totalCans].map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setNationalCraftRatio(option);
                    ResetNationalSetSelection();
                    ResetCraftSetSelection();
                  }}
                  className={`py-2 px-4 rounded-lg text-white font-bold ${
                    JSON.stringify(nationalCraftRatio) === JSON.stringify(option) ? "bg-amber-600" : "bg-gray-300"
                  } hover:bg-amber-500 transition-all duration-200`}
                >
                  {option.national}:{option.craft}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">ナショナル銘柄数</label>
            <div className="grid grid-cols-2 gap-2">
              {nationalKindsOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setNationalKinds(option);
                    ResetNationalSetSelection();
                  }}
                  className={`py-2 px-4 rounded-lg text-white font-bold ${nationalKinds === option ? "bg-amber-600" : "bg-gray-300"} hover:bg-amber-500 transition-all duration-200`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-1">クラフト銘柄数</label>
            <div className="grid grid-cols-2 gap-2">
              {craftKindsOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setCraftKinds(option);
                    ResetCraftSetSelection();
                  }}
                  className={`py-2 px-4 rounded-lg text-white font-bold ${craftKinds === option ? "bg-amber-600" : "bg-gray-300"} hover:bg-amber-500 transition-all duration-200`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card bg-white shadow-md rounded-lg px-24 py-20 w-2/5 relative">
          <h2 className="absolute top-2 left-4 text-xl font-bold text-amber-600" style={{ fontFamily: "Poppins, sans-serif" }}>
            Step2 <span style={{ display: "block" }}>好みを確認</span>
          </h2>
          {userId !== undefined && <ProfileContainer user_id={userId} />}
        </div>

        <div className="card bg-white shadow-md rounded-lg pt-2 pb-7 px-4 w-3/5">
          <h2 className="text-xl font-bold text-amber-600 mb-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            Step3 <span style={{ display: "block" }}>びあログおすすめを選択</span>
          </h2>
          <h2 className="text-lg text-gray-600 font-bold">ナショナルビール</h2>
          <div className="overflow-y-auto h-50 bg-white rounded-lg p-4 border border-gray-300">
            <div className="grid grid-cols-2 gap-4">
              {nationalEcSets.map((ecSet) => (
                <div key={ecSet.ec_set_id}>
                  <button
                    onClick={() => {
                      setNationalSelectedSet(ecSet);
                      fetchRecommendations(ecSet.set_name, ecSet.ec_set_id, "national", nationalCraftRatio.national, nationalKinds, ngList, jwt);
                    }}
                    className={`py-2 px-4 rounded-lg text-white font-bold w-full ${
                      nationalSelectedSet?.ec_set_id === ecSet.ec_set_id ? "bg-amber-600" : "bg-gray-300"
                    } hover:bg-amber-500 transition-all duration-200 ${nationalCraftRatio.national === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={nationalCraftRatio.national === 0}
                  >
                    {ecSet.set_name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-lg text-gray-600 font-bold mt-6">クラフトビール</h2>
          <div className="overflow-y-auto h-50 bg-white rounded-lg p-4 border border-gray-300">
            <div className="grid grid-cols-2 gap-4">
              {craftEcSets.map((ecSet) => (
                <div key={ecSet.ec_set_id}>
                  <button
                    onClick={() => {
                      setCraftSelectedSet(ecSet);
                      fetchRecommendations(ecSet.set_name, ecSet.ec_set_id, "craft", nationalCraftRatio.craft, craftKinds, ngList, jwt);
                    }}
                    className={`py-2 px-4 rounded-lg text-white font-bold w-full ${
                      craftSelectedSet?.ec_set_id === ecSet.ec_set_id ? "bg-amber-600" : "bg-gray-300"
                    } hover:bg-amber-500 transition-all duration-200 ${nationalCraftRatio.craft === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={nationalCraftRatio.craft === 0}
                  >
                    {ecSet.set_name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center space-x-4 mt-4 mb-4">
        <button
          onClick={() => {
            handleAddToCart();
            // handleOpenCartModal();
          }}
          className="bg-amber-600 hover:amber-700 text-white py-2 px-48 rounded-full shadow-xl transition-all duration-300 ease-in-out transform hover:scale-110 flex items-center justify-center space-x-3 text-lg relative overflow-hidden"
        >
          Step4 選択した銘柄を確認する
        </button>
      </div>

      {/* <PurchaseSetContainer
        purchaseSetItemAll={purchaseSetItemAll}
        setPurchaseSetItemAll={setPurchaseSetItemAll}
      /> */}

      {/* Step3 の選択時に表示されるモーダルウィンドウ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeModal} // ポップアップの外側をクリックしたときにモーダルを閉じる
        >
          <div
            className="bg-white rounded-lg shadow-lg p-8 w-3/4 max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()} // ポップアップ内部のクリックイベントが外側に伝播しないようにする
          >
            <h2 className="text-lg font-bold mb-4">{selectedSetName}</h2>
            <p className="text-sm text-gray-600 mb-4">{selectedSetDescription}</p>
            <div className="grid grid-cols-3 gap-4">
              {/* 3列に分けて表示 */}
              {selectedSetDetails.map((item) => (
                <div key={item.ec_brand_id} className="mb-4 flex items-center">
                  {item.picture ? (
                    <img src={`data:image/png;base64,${item.picture}`} alt={item.name} className="w-28 h-28 object-cover rounded-full border-2 border-amber-600 mr-4" />
                  ) : (
                    <span className="w-10 h-10 rounded-full border-2 border-amber-600 mr-4 flex items-center justify-center">なし</span>
                  )}
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500">価格: {item.price} 円</p>
                    <p className="text-sm text-gray-500">本数: {item.count} 本</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={closeModal} // 「戻る」ボタンをクリックしたときにモーダルを閉じる
              className="mt-4 bg-amber-600 text-white py-2 px-4 rounded hover:bg-amber-700"
            >
              戻る
            </button>
          </div>
        </div>
      )}

      {/* Step4 の確認ポップアップ */}
      {isCartModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleResetCart} // ここで背景をクリックしたときにカートをリセットする
        >
          <div
            className="bg-white rounded-lg shadow-lg p-8 w-3/4 max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()} // このクリックイベントが背景に伝播しないようにする
          >
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-bold">選択中の銘柄</h2>
              {/* 合計金額と合計本数を表示 */}
              <div className="text-right">
                <p className="text-xl font-semibold">
                  合計金額:{" "}
                  {purchaseSetItemAll.reduce(
                    (total, item) =>
                      total +
                      item.national_set.details.reduce((sum, detail) => sum + detail.price * detail.count, 0) +
                      item.craft_set.details.reduce((sum, detail) => sum + detail.price * detail.count, 0),
                    0
                  )}{" "}
                  円
                </p>
                <p className="text-xl font-semibold">合計本数: {purchaseSetItemAll.reduce((total, item) => total + item.setDetails.cans, 0)} 本</p>
              </div>
            </div>

            {/* ナショナルセット */}
            {purchaseSetItemAll.map((item, index) => (
              <div key={`national-set-${index}`} className="mb-8">
                <h3 className="font-bold text-amber-600 text-xl mb-2">{item.national_set.set_name}</h3>
                <p className="text-sm text-gray-600 mb-4">{nationalEcSets.find((set) => set.ec_set_id === item.national_set.details[0]?.ec_set_id)?.set_description || ""}</p>
                <div className="grid grid-cols-3 gap-4">
                  {item.national_set.details.map((detail, detailIndex) => (
                    <div key={`national-${detailIndex}`} className="mb-4 flex items-center">
                      {detail.picture ? (
                        <img src={`data:image/png;base64,${detail.picture}`} alt={detail.name} className="w-28 h-28 object-cover rounded-full border-2 border-amber-600 mr-4" />
                      ) : (
                        <span className="w-28 h-28 rounded-full border-2 border-amber-600 mr-4 flex items-center justify-center">なし</span>
                      )}
                      <div>
                        <p className="font-semibold">{detail.name}</p>
                        <p className="text-sm text-gray-500">価格: {detail.price} 円</p>
                        <p className="text-sm text-gray-500">本数: {detail.count} 本</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* クラフトセット */}
            {purchaseSetItemAll.map((item, index) => (
              <div key={`craft-set-${index}`} className="mb-8">
                <h3 className="font-bold text-amber-600 text-xl mb-2">{item.craft_set.set_name}</h3>
                <p className="text-sm text-gray-600 mb-4">{craftEcSets.find((set) => set.ec_set_id === item.craft_set.details[0]?.ec_set_id)?.set_description || ""}</p>
                <div className="grid grid-cols-3 gap-4">
                  {item.craft_set.details.map((detail, detailIndex) => (
                    <div key={`craft-${detailIndex}`} className="mb-4 flex items-center">
                      {detail.picture ? (
                        <img src={`data:image/png;base64,${detail.picture}`} alt={detail.name} className="w-28 h-28 object-cover rounded-full border-2 border-amber-600 mr-4" />
                      ) : (
                        <span className="w-28 h-28 rounded-full border-2 border-amber-600 mr-4 flex items-center justify-center">なし</span>
                      )}
                      <div>
                        <p className="font-semibold">{detail.name}</p>
                        <p className="text-sm text-gray-500">価格: {detail.price} 円</p>
                        <p className="text-sm text-gray-500">本数: {detail.count} 本</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-center space-x-4 mt-4">
              {/* <button
          onClick={handleResetCart}
          className="bg-amber-600 text-white py-2 px-4 rounded hover:bg-amber-700 z-50 relative"
        >
          もう一度選ぶ
        </button> */}
              <button
                onClick={handlePurchaseItemAll}
                className="bg-amber-600 hover:amber-700 text-white py-2 px-96 rounded-full shadow-xl transition-all duration-300 ease-in-out transform hover:scale-110 flex items-center justify-center space-x-3 text-lg overflow-hidden z-50 relative"
              >
                購入する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
