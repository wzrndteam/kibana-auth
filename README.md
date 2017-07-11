# Kibana Auth plugin
Kibana에서 Ldap 연동을 통한 사용자 인증과 접근 권한을 관리할 수 있는 플러그인입니다.  
권한 관리를 조금만 확장하면, ElasticSearch의 Index 별 권한 관리도 가능할 수 있어 보입니다.

# 설치
## Online 설치
아래와 같이 플러그인을 설치할 수 있습니다.

    /opt/kibana/bin/kibana plugin -i kibana-auth -u https://github.com/wzrndteam/kibana-auth/releases/download/0.0.1/kibana4-auth-0.0.1.zip

Ubuntu에서 설치 시, 권한 설정에 주의하시기 바랍니다.
Ubuntu에서는 설치 후 플러그인 설치 폴더의 소유자를 변경해야 할 수 있습니다.

    chown -R kibana: /opt/kibana/installedPlugins

## Offline 설치
Offline 환경에서 설치할 경우, 설치 파일을 다운로드 받아서 설치할 수 있습니다.

    설치파일 : https://github.com/wzrndteam/kibana-auth/releases/download/0.0.1/kibana4-auth-0.0.1.zip

설치 명령어는 아래와 같습니다.

    /opt/kibana/bin/kibana plugin -i kibana-auth -u {설치파일경로}

윈도우 환경일 경우, file:// 프로토콜을 이용하여 설치할 수 있습니다.

    (설치 파일 경로가 E:\kibana4-auth-0.0.1.zip 일 경우)
    bin\kibana plugin -i kibana-auth file://e/kibana4-auth-0.0.1.zip

# 초기 설정
우선 Config 파일을 구성해야 합니다.  
Kibana 설치 폴더 하위의 installedPlulgins/kibana-auth 폴더로 이동합니다.  

    ex, cd /opt/kibana/installedPlugins/kibana-auth/

config.json.template 파일을 복사하여, config.json 파일을 만듭니다.

## Config 파일 구성
config.json 파일 생성 후 Kibana를 재시작 해야만 변경 사항이 적용 됩니다.  
설정 항목 별 내용은 아래와 같습니다.  

- kibana_version : Kibana의 버전을 명시합니다. (ex, 4.6.4)
- default_cookie_secret: 인증 쿠키를 암호화 하는데 사용할 키를 설정합니다.
- default_user_secret: 유저 정보를 암호화 하는데 사용할 키를 설정합니다.
- index_user_info: ElasticSearch에 저장 될 User 정보의 Index 명을 지정합니다.
- index_group_info: ElasticSearch에 저장 될 Group 정보의 Index 명을 지정합니다.
- doc_type: ElasticSearch에 저장될 Document의 type을 지정합니다.
- root_account: 초기 구성을 위해, 본인의 LDAP 로그인 ID를 입력합니다.  
초기 구성 이후 빈 값으로 변경하기를 권장합니다.  
- default_role: 기본적으로 모든 계정이 접근 가능한 경로를 지정합니다.
    - ex, "/elasticsearch/,/app/kibana,/logout,/login"
- default_role_for_manager: 특수 계정 그룹인 Manager 그룹에 기본적으로 허용 할 경로를 지정합니다.
    - ex, "/app/kibana-auth#manager"
- limited_access_ui: Kibana UI 상에서 접근을 통제할 링크의 경로를 지정합니다.  
여기에 지정된 경로는, Kibana UI의 메뉴 상에서 숨겨지게 됩니다.
    - ex, "/app/sense,/app/kibana#settings,/app/kibana-auth#manager"
- ldap_url: LDAP 인증 서버 정보를 입력합니다.
    - ex, "ldap://yourdomain.com"
- ldap_domain: LDAP 인증 도메인 정보를 입력합니다.
    - ex, "yourdomain.com"
- ldap_path: LDAP 인증 경로를 인증합니다.
    - ex, "OU=Users,OU=Group,DC=youdomain,DC=com"


## 초기 정보 구성
Config 파일을 구성하고, root_account에 지정된 계정으로 로그인 하면,  
Admin 권한으로 로그인 되어 전체 기능을 제약 없이 사용할 수 있습니다.

상단 메뉴에서 Kibana Auth를 찾아 클릭하면, 계정 관리 화면으로 진입합니다.

기본 구성 그룹인 Admin과 Manager가 Group List에 출력되고,
User List는 비어 있는 것을 확인할 수 있습니다.

### Group 권한
* Admin은 최상위 권한을 가진 특수 그룹으로, 대부분의 권한 설정에 대한 제약을 받지 않습니다.  
그룹의 관리와 그룹 별 권한 설정은 Admin 그룹에 속한 계정만 가능합니다.
* Manager는 Admin 다음의 상위 권한을 가진 특수 그룹입니다.  
하지만 권한 설정의 제약은 동일하게 적용 됩니다.  
예외적으로 별도의 권한 설정 없이도 계정 관리 페이지에 대한 접근이 허용됩니다.  
=> config.json의 default_role_for_manager에 의해 작동합니다.
* 그 외 생성하는 모든 그룹은 일반 권한 그룹에 속하며,  
상위 권한 그룹인 Admin이나 Manager 그룹과 그 구성원의 속성을 변경할 수 없습니다.

### Group과 User 생성
상단 Add User에서 생성할 항목의 Type을 Group과 User 중에 선택할 수 있습니다.

필요한 유저 그룹들을 생성한 다음, 각 유저들을 생성된 그룹에 속하도록 하여 계정을 생성할 수 있습니다.

필요한 그룹과 유저들의 구성이 완료되면, 설정 파일에서 root_account 항목을 빈 값으로 변경해 줍니다.

## 접근 권한 설정
접근 권한은 Group List에서 설정이 가능합니다.  
설정 방식은 URL의 경로를 입력하여 접근 가능한 경로를 추가해 줍니다.

1. 각 항목은 콤마로 구분됩니다.
1. 권한을 주려는 페이지 또는 기능이 api를 사용하는 경우, 해당 api 경로도 허용해 주어야 합니다.  
    ex, Sense의 경우, /app/sense와 /api/sense 두개를 추가해 주어야 합니다.
1. 입력한 경로에 #이 포함된 경우, # 이후는 무시하고 앞부분의 경로에 대해 허용 처리 됩니다.
1. config.json 파일에서 설정한 limited_access_ui 에서는, #을 구분자로 링크를 찾습니다.  
    ex, /app/kibana#discover 를 입력한 경우, 경로가 /app/kibana 를 포함하고 있고,  
    hash 값에 discover가 포함된 링크를 찾아 숨겨줍니다.
