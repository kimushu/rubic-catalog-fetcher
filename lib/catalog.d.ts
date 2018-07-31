declare namespace RubicCatalog {
    /**
     * ja: カタログ情報ルート (公式カタログサイトのcatalog.jsonそのもの)
     * en: Root structure of catalog information
     */
    interface Root {
        /**
         * ja: 対応するRubicのバージョンの範囲 (これを満たさないRubic利用者はカタログ更新不可)
         * en: Range of version of Rubic which supports this catalog
         */
        rubicVersion: string;

        /**
         * ja: このJSONの最終更新時刻 (Date.now()の値)
         * en: Timestamp of last modified (by Date.now() value)
         */
        lastModified: number;

        /**
         * ja: ボード一覧 (この配列の順番が原則としてカタログ上の表示順序となる)
         * en: List of board definitions (The order of this array will be used as the order of catalog list)
         */
        boards: Board[];

        /**
         * ja: ボードv1一覧 (この配列の順番が原則としてカタログ上の表示順序となる)
         * en: List of board v1 definitions (The order of this array will be used as the order of catalog list)
         */
        boardsV1: BoardV1[];
    }

    /**
     * ja: 多言語対応文字列 (英語は必須)
     * en: Multiligual string (English is always required. Other languages are optional)
     */
    interface LocalizedString {
        en:  string;        /** English (always required) */
        de?: string;        /** German   */
        es?: string;        /** Spanish  */
        fr?: string;        /** French   */
        it?: string;        /** Italian  */
        ja?: string;        /** Japanese */
        ko?: string;        /** Korean   */
        ru?: string;        /** Russian  */
        "zh-cn"?: string;   /** Chinese (China)  */
        "zh-tw"?: string;   /** Chinese (Taiwan) */
    }

    /**
     * ja: トピック定義
     * en: Topic definition
     */
    interface Topic {
        /**
         * ja: トピックの名前
         * en: Name of topic
         */
        name: LocalizedString;

        /**
         * ja: 色
         * en: Color of topic
         */
        color: undefined|"gray"|"blue"|"green"|"lightblue"|"orange"|"red";
    }

    /**
     * ja: ボード定義 (catalog.jsonの一部)
     * en: Board definition
     */
    interface Board {
        /**
         * ja: ボードクラス名 (Rubic内部実装と合わせる)
         * ※ワークスペースのボード指定に使用されるIDであり、公開後の変更禁止。
         * en: Name of board class (Must be accorded with Rubic implementation)
         * (*) DO NOT CHANGE THIS FIELD AFTER PUBLICATION.
         */
        class: string;

        /**
         * ja: 無効化して表示対象から除外するかどうか
         * en: Is disabled (Disabled board is excluded from list)
         */
        disabled?: boolean;

        /**
         * ja: ボード名称
         * en: Name of board
         */
        name: LocalizedString;

        /**
         * ja: 説明文
         * en: Description
         */
        description: LocalizedString;

        /**
         * ja: アイコン画像(Rubic相対パス or URL)
         * en: Icon image (Relative path in Rubic or URL)
         */
        icon?: string;

        /**
         * ja: 作者名
         * en: Author name
         */
        author: LocalizedString;

        /**
         * ja: WEBサイト URL
         * en: URL of website for this board
         */
        website?: LocalizedString;

        /**
         * ja: プレビュー版か否か(省略時=false)
         * en: Set true if preview version (default: false)
         */
        preview?: boolean;

        /**
         * ja: トピック一覧
         * en: List of topics
         */
        topics: Topic[];

        /**
         * リポジトリ一覧
         * この配列の順番が原則としてカタログ上の表示順序となる。
         */
        repositories: RepositorySummary[];
    }

    /**
     * ja: ボード定義v1 (catalog.jsonの一部)
     * en: Board definition (v1)
     */
    interface BoardV1 extends Board {
        /**
         * ja: 対応するRubicのバージョンの範囲 (これを満たさないボードは非表示)
         * en: Range of version of Rubic which supports this board
         */
        rubicVersion?: string;

        /**
         * リポジトリ一覧
         * この配列の順番が原則としてカタログ上の表示順序となる。
         */
        repositories: RepositorySummaryV1[];
    }

    /**
     * リポジトリ概要情報 (catalog.jsonの一部)
     */
    interface RepositorySummary {
        /**
         * UUID
         * ※ワークスペースのファーム指定に使用されるIDであり、公開後の変更禁止。
         */
        uuid: string;

        /** 無効化されているか否か(省略時=false) */
        disabled?: boolean;

        /** ボードベンダーの公式ファームか否か(省略時=false) */
        official?: boolean;

        /** カスタムリポジトリか否か(省略時=false) */
        custom?: boolean;

        /** ホスティングサイト */
        host: "github";

        /** 所有者 */
        owner: string;

        /** リポジトリ名 */
        repo: string;

        /** ブランチ名(省略時=master) */
        branch?: string;

        /** 詳細情報(rubic-repository.jsonの中身) */
        cache?: RepositoryDetail;
    }

    /**
     * リポジトリ概要情報v1 (catalog.jsonの一部)
     */
    interface RepositorySummaryV1 extends RepositorySummary {
        /**
         * ja: 対応するRubicのバージョンの範囲 (これを満たさないリポジトリは非表示)
         * en: Range of version of Rubic which supports this repository
         */
        rubicVersion?: string;

        /** 詳細情報(rubic-repository.jsonの中身) */
        cache?: RepositoryDetailV1;
    }

    /**
     * リポジトリ詳細定義 (rubic-repository.json)
     */
    interface RepositoryDetail {
        /** 名前 */
        name: LocalizedString;

        /** 説明 */
        description: LocalizedString;

        /** プレビュー版か否か(省略時=false) */
        preview?: boolean;

        /** リリース一覧 */
        releases?: ReleaseSummary[];

        /** ボード固有情報 */
        boardData?: any;
    }

    /**
     * リポジトリ詳細定義v1 (rubic-repository.json)
     */
    interface RepositoryDetailV1 extends RepositoryDetail {
        /**
         * ja: 対応するRubicのバージョンの範囲 (これを満たさないリポジトリは選択不可)
         * en: Range of version of Rubic which supports this repository
         */
        rubicVersion?: string;

        /** リリース一覧 */
        releases?: ReleaseSummaryV1[];
    }

    /**
     * リリース概要定義 (catalog.jsonの一部)
     */
    interface ReleaseSummary {
        /**
         * リリースのタグ名
         * ※ワークスペースのファーム指定に使用されるIDであり、公開後の変更禁止。
         */
        tag: string;

        /** リリースの名称 (GitHubリリース名、英語のみ) */
        name: string;

        /** リリースの説明 (GitHubリリース説明、英語のみ) */
        description: string;

        /** プレビュー版か否か(省略時=false) */
        preview?: boolean;

        /** 公開日 (GitHubのリリース情報 published_at より。ただし値は Date.now() フォーマット) */
        published_at: number;

        /** 更新日 (assetのupdated_atより) */
        updated_at: number;

        /** 作者名 (GitHubのauthorのログインID) */
        author: string;

        /** zip assetのURL */
        url: string;

        /** zipに格納された release.json のキャッシュ */
        cache: ReleaseDetail;
    }

    /**
     * リリース概要定義v1 (catalog.jsonの一部)
     */
    interface ReleaseSummaryV1 extends ReleaseSummary {
        /** zipに格納された release.json のキャッシュ */
        cache: ReleaseDetailV1;
    }

    /**
     * リリース詳細定義 (release.jsonの中身そのもの)
     */
    interface ReleaseDetail {
        /** リリースの名称 (存在しない場合、Summaryのnameから引用) */
        name?: LocalizedString;

        /** リリースの説明文 (存在しない場合、Summaryのdescriptionから引用) */
        description?: LocalizedString;

        /** バリエーション一覧 */
        variations: Variation[];

        /** ボード固有情報 */
        boardData?: any;
    }

    /**
     * リリース詳細定義v1 (release.jsonの中身そのもの)
     */
    interface ReleaseDetailV1 extends ReleaseDetail {
        /**
         * ja: 対応するRubicのバージョンの範囲 (これを満たさないリリースは選択不可)
         * en: Range of version of Rubic which supports this release
         */
        rubicVersion?: string;

        /** バリエーション一覧 */
        variations: VariationV1[];
    }

    /**
     * バリエーション定義 (release.jsonの一部)
     */
    interface Variation {
        /**
         * アーカイブ(zip)内のパス
         * ※ワークスペースのファーム指定に使用されるIDであり、公開後の変更禁止。
         */
        path: string;

        /** バリエーションの名前 */
        name: LocalizedString;

        /** バリエーションの説明文 */
        description: LocalizedString;

        /** プレビュー版か否か(省略時=false) */
        preview?: boolean;
        
        /** ファームウェアの識別ID */
        firmwareId?: string;

        /** ランタイムの一覧 */
        runtimes: (Runtime.Common|Runtime.Mruby|Runtime.Duktape|Runtime.Lua)[];

        /** ドキュメントのコンテンツ(Markdown) */
        document?: LocalizedString;

        /** ボード固有情報 */
        boardData?: any;
    }

    /**
     * バリエーション定義 (release.jsonの一部)
     */
    interface VariationV1 extends Variation {
        /**
         * ja: 対応するRubicのバージョンの範囲 (これを満たさないバリエーションは選択不可)
         * en: Range of version of Rubic which supports this variation
         */
        rubicVersion?: string;
    }

    /**
     * ランタイム情報
     */
    namespace Runtime {
        /** ランタイム共通定義 */
        interface Common {
            /** ランタイムの名前 */
            name: string;
            /** テンプレートデータのアーカイブファイル名 */
            template?: string;
            /** ライブラリデータのアーカイブファイル名 */
            library?: string;
        }

        /** Rubyランタイム(name=mruby) */
        interface Mruby extends Common {
            /** バージョン(x.x.x) */
            version: string;
            /** mrbgemの一覧 */
            mrbgems?: MrubyGem[];
        }

        /** mruby用gem定義 */
        interface MrubyGem {
            /** mrbgemの名称 */
            name: string;
            /** 説明文(英語のみ) */
            description: string;
        }

        /** JavaScript(ES5)ランタイム(name=duktape) */
        interface Duktape extends Common {
            /** バージョン(x.x.x) */
            version: string;
        }

        /** Luaランタイム(name=lua) */
        interface Lua extends Common {
            /** バージョン(x.x.x) */
            version: string;
        }
    }
}
