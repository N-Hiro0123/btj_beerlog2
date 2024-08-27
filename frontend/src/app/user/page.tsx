"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import Navbar from "../common/Navbar"; // Navbarコンポーネントのインポート
import ProfileContainer from "./ProfileContainer"; // ProfileContainerコンポーネントのインポート
import PhotosContainer from "./PhotosContainer"; // PhotosContainerコンポーネントのインポート

interface User {
  user_id: number;
  user_name: string;
  user_profile: string;
  user_picture: string;
}

interface Photo {
  photo_id: number;
  photo_data: string;
}

interface UserWithPhotos {
  user: User;
  photos: Photo[];
}

interface ErrorResponse {
  detail: string;
}

export default function UserPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [userWithPhotos, setUserWithPhotos] = useState<UserWithPhotos | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // JWTからuser_idを取得する関数 (ログイン機能実装後に有効化)
  const fetchUserIdFromJWT = () => {
    const token = localStorage.getItem("token"); // JWTトークンをローカルストレージから取得
    if (token) {
      const decodedToken: any = JSON.parse(atob(token.split(".")[1]));
      return decodedToken.sub; // ここでJWTのペイロードからuser_idを取得
    }
    return null;
  };

  // JWTからuser_idを取得してuserIdステートに設定 (ログイン機能実装後に有効化)
  useEffect(() => {
    const id = fetchUserIdFromJWT();
    if (id !== null) {
      setUserId(id);
      fetchUserWithPhotos(id); // JWTから取得したuser_idでユーザー情報をフェッチ
    }
  }, []);

  const fetchUserWithPhotos = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_API_ENDPOINT + `/user_with_photos`, {
        params: { user_id: id },
      });
      setUserWithPhotos(response.data);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ErrorResponse>;
      setError(axiosError.response?.data?.detail || "User not found or an error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId !== null) {
      fetchUserWithPhotos(userId);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pt-20 mt-5">
      <Navbar /> {/* Navbarコンポーネントの表示 */}
      <div className="py-4 px-32">
        {/* ログイン機能実装後に削除 */}
        {/* <div className="mb-4 p-4 border bg-red-200 border-red-500 rounded">
          <p className="text-red-500 font-bold mb-2">ログイン機能実装後に削除</p>
          <form onSubmit={handleSubmit} className="mb-4">
            <label className="block mb-2">
              Enter User ID:
              <input
                type="number"
                value={userId !== null ? userId : ''}
                onChange={(e) => setUserId(parseInt(e.target.value))}
                className="border p-2 rounded w-full"
              />
            </label>
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">Fetch User</button>
          </form>
        </div> */}
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {userWithPhotos && (
          <>
            <ProfileContainer user={userWithPhotos.user} />
            <PhotosContainer photos={userWithPhotos.photos} />
          </>
        )}
      </div>
    </div>
  );
}
