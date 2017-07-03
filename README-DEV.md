# Kibana Auth plugin
Kibana에서 Ldap 연동을 통한 사용자 인증과 접근 권한을 관리할 수 있는 플러그인입니다.  
권한 관리를 조금만 확장하면, ElasticSearch의 Index 별 권한 관리도 가능할 수 있어 보입니다.

# Kibana plugin 구성
Kibana는 서버는 Node.js로, 클라이언트는 Angularjs로 제작되었습니다.  
Kibana 4.6.4 버전 기준으로, Angularjs 1.4.7을 사용하고 있습니다.

플러그인은 /kibana/src/plugins 또는 /kibana/installedPlugins 에서 확인할 수 있습니다.  
/kibana/src/plugins는 Kibana를 기본적으로 구성하고있는 구성요소들이 들어 있습니다.  
새로 제작하는 플러그인은 /kibana/installedPlugins에 구성하는 것이 바람직합니다.  


# 파일 구성
## 플러그인 기본 구성 파일
- package.json : 플러그인의 이름과 버전, Kibana 버전 등 기본 정보
- index.js : 플러그인 진입점
- __gulpfile.js : NPM 빌드를 위해 플러그인 종속성 등을 기록한 파일 (사용하지 않음)

## Kibana Auth plugin 구성 파일

### /
- config.json : Kibana Auth의 구성 정보

### /public
클라이언트에서 사용되는 파일 집합

### /public/login
- ELIS-Kibana-Logo.png : 로그인 화면에서 노출되는 로고
- login.html : 로그인 페이지
- login.js : 로그인과 계정 관리 페이지 컨트롤러
- manager.html : 계정 관리 페이지

### /public/logout
- logout.html : 로그아웃 버튼
- logout.js : 로그아웃 버튼 컨트롤러

### /server
서버에서 사용되는 파일 집합

- auth-local-cookie.js : 인증 및 인증 쿠키 관련 API 및 컨트롤러
- usermanager.js : 계정 관리 API


# 플러그인 코드 구성
## /index.js
이 플러그인은, 총 3개의 UI 플러그인과 2개의 서버 플러그인으로 구성되어 있습니다.
* UI 플러그인
    * app : 로그인 페이지 및 계정 관리 페이지
    * chromeNavControls : 로그아웃 버튼
    * hacks : UI 상에서 권한이 없는 메뉴를 제거하기 위한 스크립트 핵

* 서버 플러그인
    * auth-local-cookie : 인증 및 인증 쿠키 관련 API 및 컨트롤러
    * usermanager : 계정 관리 API
